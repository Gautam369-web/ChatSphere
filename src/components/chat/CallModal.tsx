"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useChatStore } from "@/store/useChatStore";
import { useSocket, getSocket } from "@/hooks/useSocket";
import { callSounds } from "@/lib/callSounds";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  ScreenShare,
  AlertCircle,
  Volume2,
  VolumeX,
} from "lucide-react";

// Standard Public STUN servers for WebRTC NAT Traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export function CallModal() {
  const { data: session } = useSession();
  const { activeCall, setActiveCall } = useChatStore();
  const { socket: hookSocket, acceptCall, rejectCall, endCall, sendCallSignal } = useSocket();

  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Streams in state to guarantee DOM re-render and video srcObject binding
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const queuedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasStartedMediaRef = useRef(false);

  const isIncoming = activeCall?.status === "incoming";
  const isConnected = activeCall?.status === "connected";
  const isOutgoing = activeCall?.status === "outgoing";
  const isVideoCall = activeCall?.callType === "video";

  // Cleanup helper
  const cleanupMediaAndPeer = useCallback(() => {
    callSounds.stop();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setHasRemoteVideo(false);

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    queuedCandidatesRef.current = [];
    hasStartedMediaRef.current = false;
  }, []);

  // Duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [isConnected]);

  // Audio ringtones management
  useEffect(() => {
    if (!activeCall) {
      cleanupMediaAndPeer();
      return;
    }

    if (activeCall.status === "outgoing") {
      callSounds.startOutgoingRinging();
    } else if (activeCall.status === "incoming") {
      callSounds.startIncomingRingtone();
    } else if (activeCall.status === "connected") {
      callSounds.playConnectedTone();
    }

    return () => {
      callSounds.stop();
    };
  }, [activeCall?.status, cleanupMediaAndPeer]);

  // Attach local stream to video element whenever it changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Attach remote stream to remote video and audio elements
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  // Flush queued ICE candidates once remote description is set
  const flushQueuedCandidates = useCallback(async (pc: RTCPeerConnection) => {
    while (queuedCandidatesRef.current.length > 0) {
      const candidate = queuedCandidatesRef.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Error adding queued ICE candidate:", e);
        }
      }
    }
  }, []);

  // Initialize local media stream
  const acquireLocalMedia = useCallback(async (wantVideo: boolean) => {
    try {
      setErrorMessage(null);
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: wantVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
        });
      } catch (err) {
        console.warn("Could not get requested video, falling back to audio only:", err);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (wantVideo) {
          setErrorMessage("Camera unavailable. Using microphone only.");
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error("Failed to access media devices:", err);
      setErrorMessage(err.message || "Microphone / Camera access denied.");
      return null;
    }
  }, []);

  // For Outgoing caller: Acquire camera preview immediately on mount
  useEffect(() => {
    if (!activeCall || activeCall.status !== "outgoing" || hasStartedMediaRef.current) return;
    hasStartedMediaRef.current = true;

    acquireLocalMedia(isVideoCall);
  }, [activeCall, isVideoCall, acquireLocalMedia]);

  // Helper to create or get peer connection
  const getOrCreatePeerConnection = useCallback(
    (targetUserId: string, localMedia: MediaStream) => {
      if (pcRef.current) return pcRef.current;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local media tracks
      localMedia.getTracks().forEach((track) => {
        pc.addTrack(track, localMedia);
      });

      // Handle remote incoming tracks
      pc.ontrack = (event) => {
        const stream = event.streams[0];
        setRemoteStream(stream);
        if (event.track.kind === "video") {
          setHasRemoteVideo(true);
          event.track.onended = () => setHasRemoteVideo(false);
          event.track.onmute = () => setHasRemoteVideo(false);
          event.track.onunmute = () => setHasRemoteVideo(true);
        }
      };

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendCallSignal(targetUserId, {
            type: "candidate",
            candidate: event.candidate.toJSON(),
          });
        }
      };

      return pc;
    },
    [sendCallSignal]
  );

  // Recipient Accepts Incoming Call
  const handleAcceptIncomingCall = async () => {
    if (!activeCall) return;
    callSounds.stop();

    try {
      const stream = await acquireLocalMedia(isVideoCall);
      if (!stream) return;

      // Send call accept signal to caller
      acceptCall(activeCall.caller.id);
      setActiveCall({ ...activeCall, status: "connected" });
    } catch (err: any) {
      console.error("Error accepting call:", err);
      setErrorMessage(err.message || "Failed to establish connection");
      callSounds.playEndTone();
      setTimeout(() => {
        setActiveCall(null);
      }, 2500);
    }
  };

  // Listen to WebRTC signaling events from custom window events
  useEffect(() => {
    // 1. Caller receives "call_accepted" from Recipient
    const handleCallAccepted = async () => {
      callSounds.stop();
      const currentCall = activeCall;
      if (!currentCall) return;

      try {
        let stream = localStreamRef.current;
        if (!stream) {
          stream = await acquireLocalMedia(isVideoCall);
        }
        if (!stream) return;

        const pc = getOrCreatePeerConnection(currentCall.caller.id, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendCallSignal(currentCall.caller.id, {
          type: "offer",
          offer,
        });

        setActiveCall({ ...currentCall, status: "connected" });
      } catch (err) {
        console.error("Error creating WebRTC offer on call_accepted:", err);
      }
    };

    // 2. Both peers handle incoming WebRTC signals (offer, answer, candidate)
    const handleCallSignal = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { signal, from } = customEvent.detail || {};
      const currentCall = activeCall;
      if (!signal || !currentCall) return;

      try {
        // If received OFFER (Recipient handles this)
        if (signal.type === "offer" && signal.offer) {
          let stream = localStreamRef.current;
          if (!stream) {
            stream = await acquireLocalMedia(isVideoCall);
          }
          if (!stream) return;

          const pc = getOrCreatePeerConnection(from || currentCall.caller.id, stream);
          await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
          await flushQueuedCandidates(pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          sendCallSignal(from || currentCall.caller.id, {
            type: "answer",
            answer,
          });

          setActiveCall({ ...currentCall, status: "connected" });
        }
        // If received ANSWER (Caller handles this)
        else if (signal.type === "answer" && signal.answer) {
          const pc = pcRef.current;
          if (pc && pc.signalingState !== "stable") {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
            await flushQueuedCandidates(pc);
            setActiveCall({ ...currentCall, status: "connected" });
          }
        }
        // If received ICE CANDIDATE
        else if (signal.type === "candidate" && signal.candidate) {
          const pc = pcRef.current;
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            queuedCandidatesRef.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.warn("Signal handling error:", err);
      }
    };

    const handleCallEnded = () => {
      callSounds.playEndTone();
      cleanupMediaAndPeer();
      setActiveCall(null);
    };

    const handleCallRejected = () => {
      callSounds.playEndTone();
      setErrorMessage("Call declined");
      setTimeout(() => {
        cleanupMediaAndPeer();
        setActiveCall(null);
      }, 1500);
    };

    window.addEventListener("chatsphere:call_accepted", handleCallAccepted);
    window.addEventListener("chatsphere:call_signal", handleCallSignal);
    window.addEventListener("chatsphere:call_ended", handleCallEnded);
    window.addEventListener("chatsphere:call_rejected", handleCallRejected);

    return () => {
      window.removeEventListener("chatsphere:call_accepted", handleCallAccepted);
      window.removeEventListener("chatsphere:call_signal", handleCallSignal);
      window.removeEventListener("chatsphere:call_ended", handleCallEnded);
      window.removeEventListener("chatsphere:call_rejected", handleCallRejected);
    };
  }, [
    activeCall,
    isVideoCall,
    acquireLocalMedia,
    getOrCreatePeerConnection,
    flushQueuedCandidates,
    sendCallSignal,
    cleanupMediaAndPeer,
    setActiveCall,
  ]);

  // Toggle Microphone
  const toggleMicrophone = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  // Toggle Camera
  const toggleCamera = async () => {
    if (!localStreamRef.current) return;

    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      const willBeOff = videoTracks[0].enabled;
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(willBeOff);
    } else {
      // User started as audio-only, request camera and add track to peer connection
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode },
        });
        const newTrack = videoStream.getVideoTracks()[0];
        localStreamRef.current.addTrack(newTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

        if (pcRef.current) {
          pcRef.current.addTrack(newTrack, localStreamRef.current);
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          if (activeCall) {
            sendCallSignal(activeCall.caller.id, { type: "offer", offer });
          }
        }
        setIsVideoOff(false);
      } catch (err: any) {
        setErrorMessage("Camera permission denied or unavailable.");
      }
    }
  };

  // Flip Camera (Mobile)
  const flipCamera = async () => {
    if (!localStreamRef.current || !pcRef.current) return;
    const nextMode = facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode },
      });
      const newTrack = newStream.getVideoTracks()[0];

      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(newTrack);
      }

      const oldTracks = localStreamRef.current.getVideoTracks();
      oldTracks.forEach((t) => t.stop());
      localStreamRef.current.removeTrack(oldTracks[0]);
      localStreamRef.current.addTrack(newTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setFacingMode(nextMode);
    } catch (err) {
      console.warn("Could not flip camera:", err);
    }
  };

  // Screen Sharing
  const toggleScreenShare = async () => {
    if (!pcRef.current || !localStreamRef.current) return;

    if (isScreenSharing) {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        const camTrack = cameraStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(camTrack);
        }
        localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
        localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
        localStreamRef.current.addTrack(camTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setIsScreenSharing(false);
      } catch (e) {}
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setLocalStream(screenStream);
        setIsScreenSharing(true);
      } catch (e) {
        console.warn("Screen share cancelled:", e);
      }
    }
  };

  // Toggle Speaker Audio Mute
  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
      setIsSpeakerMuted(remoteAudioRef.current.muted);
    }
  };

  // End or Decline
  const handleEndCall = () => {
    if (!activeCall) return;
    callSounds.playEndTone();
    endCall(activeCall.caller.id, activeCall.conversationId);
    cleanupMediaAndPeer();
    setActiveCall(null);
  };

  const handleDeclineCall = () => {
    if (!activeCall) return;
    callSounds.playEndTone();
    rejectCall(activeCall.caller.id);
    cleanupMediaAndPeer();
    setActiveCall(null);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!activeCall) return null;

  return (
    <div
      ref={modalContainerRef}
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-md transition-all duration-300 ${
        isFullscreen ? "p-0" : "p-3 sm:p-6"
      }`}
    >
      {/* Hidden remote audio element for crystal-clear real-time voice */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div
        className={`relative w-full ${
          isFullscreen
            ? "h-full rounded-none"
            : isVideoCall
            ? "max-w-4xl h-[88vh] max-h-[750px] rounded-3xl"
            : "max-w-sm rounded-3xl"
        } bg-[#111b21] dark:bg-[#0b141a] border border-slate-800 shadow-2xl flex flex-col items-center justify-between overflow-hidden transition-all duration-300`}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="w-full px-5 py-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400 animate-ping"
              }`}
            />
            <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
              {isVideoCall ? "Video Call" : "Voice Call"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isVideoCall && (
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Notification / Error alert */}
        {errorMessage && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Center Content: Video Streams or Avatar Calling Card */}
        {isVideoCall ? (
          <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-slate-950">
            {/* Remote Video Stream (Main View) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                hasRemoteVideo ? "opacity-100" : "opacity-0 absolute"
              }`}
            />

            {/* If Remote Video is not streaming yet or audio-only */}
            {(!hasRemoteVideo || !isConnected) && (
              <div className="flex flex-col items-center justify-center p-6 text-center z-10 space-y-4">
                <div className="relative">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-emerald-500/40 shadow-2xl bg-slate-800">
                    <img
                      src={
                        activeCall.caller.image ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${activeCall.caller.name || "User"}`
                      }
                      alt={activeCall.caller.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {!isConnected && (
                    <span className="absolute -inset-2 rounded-full border-2 border-emerald-400/50 animate-ping pointer-events-none" />
                  )}
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    {activeCall.caller.name || activeCall.caller.username || "Contact"}
                  </h3>
                  <p className="text-sm font-medium text-emerald-400">
                    {isIncoming
                      ? "Incoming video call..."
                      : isConnected
                      ? `Connected • ${formatDuration(callDuration)}`
                      : "Calling..."}
                  </p>
                </div>
              </div>
            )}

            {/* Local Camera Floating PiP (Bottom-Right) */}
            <div
              className={`absolute bottom-24 right-4 sm:bottom-28 sm:right-6 w-32 h-44 sm:w-40 sm:h-56 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black z-30 transition-all ${
                isVideoOff ? "hidden" : "block"
              }`}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            </div>
          </div>
        ) : (
          /* Voice Call Center Avatar Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 space-y-5 my-auto">
            <div className="relative">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-4 ring-emerald-500/40 shadow-2xl bg-slate-800">
                <img
                  src={
                    activeCall.caller.image ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${activeCall.caller.name || "User"}`
                  }
                  alt={activeCall.caller.name || "User"}
                  className="w-full h-full object-cover"
                />
              </div>

              {!isConnected && (
                <span className="absolute -inset-3 rounded-full border-2 border-emerald-500/60 animate-ping pointer-events-none" />
              )}
            </div>

            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1.5">
                {activeCall.caller.name || activeCall.caller.username || "Contact"}
              </h3>
              <p className="text-sm font-semibold text-emerald-400">
                {isIncoming
                  ? "Incoming voice call..."
                  : isConnected
                  ? `Connected • ${formatDuration(callDuration)}`
                  : "Calling..."}
              </p>
            </div>
          </div>
        )}

        {/* Bottom Call Controls Toolbar */}
        <div className="w-full px-6 py-6 pb-8 flex items-center justify-center gap-3 sm:gap-5 z-20 bg-gradient-to-t from-black/80 to-transparent">
          {isIncoming ? (
            /* Incoming Actions: Decline or Accept */
            <div className="flex items-center gap-8 animate-in fade-in zoom-in-95">
              <button
                onClick={handleDeclineCall}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
                title="Decline"
              >
                <div className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 group-active:scale-95 transition">
                  <PhoneOff className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium text-slate-300">Decline</span>
              </button>

              <button
                onClick={handleAcceptIncomingCall}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
                title="Accept"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-600/50 group-active:scale-95 transition animate-bounce">
                  <Phone className="w-7 h-7" />
                </div>
                <span className="text-xs font-medium text-emerald-400 font-bold">Accept</span>
              </button>
            </div>
          ) : (
            /* Active Call Controls */
            <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap justify-center">
              {/* Mute Mic */}
              <button
                onClick={toggleMicrophone}
                className={`p-3.5 sm:p-4 rounded-full transition cursor-pointer ${
                  isMuted
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Toggle Camera (Video & Audio) */}
              <button
                onClick={toggleCamera}
                className={`p-3.5 sm:p-4 rounded-full transition cursor-pointer ${
                  isVideoOff
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
                title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              {/* Flip Camera (for mobile video call) */}
              {isVideoCall && (
                <button
                  onClick={flipCamera}
                  className="p-3.5 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="Flip Camera"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}

              {/* Screen Share (Desktop) */}
              {isVideoCall && typeof navigator !== "undefined" && "getDisplayMedia" in navigator.mediaDevices && (
                <button
                  onClick={toggleScreenShare}
                  className={`p-3.5 sm:p-4 rounded-full transition cursor-pointer ${
                    isScreenSharing
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                  title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
                >
                  <ScreenShare className="w-5 h-5" />
                </button>
              )}

              {/* Speaker Mute Toggle */}
              <button
                onClick={toggleSpeaker}
                className={`p-3.5 sm:p-4 rounded-full transition cursor-pointer ${
                  isSpeakerMuted
                    ? "bg-rose-600 text-white"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
                title={isSpeakerMuted ? "Unmute Speaker" : "Mute Speaker"}
              >
                {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              {/* End Call Button */}
              <button
                onClick={handleEndCall}
                className="p-3.5 sm:p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/40 active:scale-95 transition cursor-pointer ml-1"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
