"use client";

import { useEffect, useState } from "react";
import "./DiscordWidget.css";

interface DiscordWidgetData {
  id: string;
  name: string;
  instant_invite: string | null;
  presence_count: number;
  members: Array<{
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    status: string;
    avatar_url: string;
  }>;
}

export default function DiscordWidget({ serverId }: { serverId: string }) {
  const [data, setData] = useState<DiscordWidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWidget = async () => {
      try {
        const res = await fetch(`https://discord.com/api/guilds/${serverId}/widget.json`);
        if (!res.ok) {
          throw new Error("Failed to fetch widget");
        }
        const json = await res.json();
        
        if (json.code === 50004) {
          // Widget disabled
          setError(true);
          return;
        }

        setData(json);
      } catch (err) {
        console.error("Error fetching Discord widget:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWidget();
  }, [serverId]);

  if (loading) {
    return (
      <div className="discord-widget skeleton">
        <div className="pulse"></div>
        <span>Memuat info server...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="discord-widget error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Widget Discord belum diaktifkan di pengaturan server.</span>
      </div>
    );
  }

  // Ambil maksimal 5 member online untuk ditampilkan avatar-nya
  const onlineMembers = data.members ? data.members.slice(0, 5) : [];

  return (
    <div className="discord-widget">
      <div className="widget-header">
        <div className="widget-server-info">
          <strong>{data.name}</strong>
          <span className="online-count">
            <span className="status-dot"></span>
            {data.presence_count} Online
          </span>
        </div>
      </div>
      
      {onlineMembers.length > 0 && (
        <div className="widget-members">
          {onlineMembers.map((member) => (
            <img 
              key={member.id} 
              src={member.avatar_url} 
              alt={member.username} 
              className="member-avatar" 
              title={`${member.username} (${member.status})`}
            />
          ))}
          {data.presence_count > 5 && (
            <div className="member-avatar more-members">
              +{data.presence_count - 5}
            </div>
          )}
        </div>
      )}

      {data.instant_invite && (
        <a href={data.instant_invite} target="_blank" rel="noopener noreferrer" className="widget-join-btn">
          Join Server
        </a>
      )}
    </div>
  );
}
