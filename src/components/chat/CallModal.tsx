"use client";

import React, { useState, useEffect } from "react";
import { useChatStore } from "@/store/useChatStore";
import { useSocket } from "@/hooks/useSocket";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Maximize2,
} from "lucide-react";

export function CallModal() {
  const { activeCall, setActiveCall } = useChatStore();
  const { acceptCall, rejectCall, endCall } = useSocket();

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall?.status === "connected") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  if (!activeCall) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isIncoming = activeCall.status === "incoming";
  const isConnected = activeCall.status === "connected";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Ambient Ring light */}
        <div className="absolute -top-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Avatar */}
        <div className="relative mb-4 mt-2">
          <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-800 ring-4 ring-indigo-500/30 shadow-xl">
            <img
              src={
                activeCall.caller.image ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${activeCall.caller.name || "User"}`
              }
              alt={activeCall.caller.name || "Caller"}
              className="w-full h-full object-cover"
            />
          </div>
          {isIncoming && (
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center animate-bounce shadow-md">
              <Phone className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        {/* Title & Call status */}
        <h3 className="text-lg font-bold text-white mb-1">
          {activeCall.caller.name || "Caller"}
        </h3>
        <p className="text-xs font-medium text-indigo-400 mb-6">
          {isIncoming
            ? `Incoming ${activeCall.callType} call...`
            : isConnected
            ? `Connected • ${formatDuration(callDuration)}`
            : `Calling...`}
        </p>

        {/* Video stream container placeholder if video call */}
        {activeCall.callType === "video" && isConnected && (
          <div className="w-full h-40 rounded-2xl bg-slate-950 border border-slate-800 mb-6 flex items-center justify-center text-slate-500 text-xs relative overflow-hidden">
            <div className="flex flex-col items-center gap-1.5">
              <Video className="w-6 h-6 text-indigo-400 animate-pulse" />
              <span>Camera Stream Active</span>
            </div>
          </div>
        )}

        {/* Actions Controls Bar */}
        <div className="flex items-center gap-4">
          {isIncoming ? (
            <>
              {/* Decline button */}
              <button
                onClick={() => rejectCall(activeCall.caller.id)}
                className="w-12 h-12 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition active:scale-95"
                title="Decline"
              >
                <PhoneOff className="w-5 h-5" />
              </button>

              {/* Accept button */}
              <button
                onClick={() => acceptCall(activeCall.caller.id)}
                className="w-14 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 transition active:scale-95 animate-pulse"
                title="Accept"
              >
                <Phone className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              {/* Mute button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition ${
                  isMuted ? "bg-slate-700 text-rose-400" : "bg-slate-800 text-white hover:bg-slate-700"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* End Call button */}
              <button
                onClick={() => endCall(activeCall.caller.id, activeCall.conversationId)}
                className="w-14 h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition active:scale-95"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              {/* Video toggle button */}
              {activeCall.callType === "video" && (
                <button
                  onClick={() => setIsVideoDisabled(!isVideoDisabled)}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition ${
                    isVideoDisabled
                      ? "bg-slate-700 text-rose-400"
                      : "bg-slate-800 text-white hover:bg-slate-700"
                  }`}
                  title={isVideoDisabled ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
