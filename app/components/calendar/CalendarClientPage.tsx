"use client";

import { useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventClickArg } from "@fullcalendar/core";
import { Plus, X } from "lucide-react";
import { EventCreateModal } from "./EventCreateModal";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Event {
  id: string;
  title: string;
  description: string | null;
  startAt: string | Date;
  endAt: string | Date;
  allDay: boolean;
  color: string;
  isImportant: boolean;
  requiresApproval: boolean;
  workspaceId: string;
  creatorId: string;
  creator: { name: string | null };
}

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  initialEvents: Event[];
  members: Member[];
}

export function CalendarClientPage({ initialEvents, members }: Props) {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  function toCalendarEvent(e: Event) {
    return {
      id: e.id,
      title: e.isImportant ? `★ ${e.title}` : e.title,
      start: new Date(e.startAt).toISOString(),
      end: new Date(e.endAt).toISOString(),
      allDay: e.allDay,
      backgroundColor: e.color,
      borderColor: e.color,
      extendedProps: { event: e },
    };
  }

  function handleEventClick(info: EventClickArg) {
    const rect = info.el.getBoundingClientRect();
    setPopoverPos({
      top: rect.bottom + window.scrollY + 8,
      left: Math.min(rect.left + window.scrollX, window.innerWidth - 300),
    });
    const extProps = info.event.extendedProps as { event: Event };
    setSelectedEvent(extProps.event);
  }

  async function handleEventCreated(event: Event) {
    setEvents((prev) => [...prev, event]);
    setShowCreate(false);

    // Also fetch wider range if event falls outside current view
    const api = calendarRef.current?.getApi();
    if (api) {
      api.refetchEvents();
    }
  }

  async function handleDeleteEvent(eventId: string) {
    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setSelectedEvent(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h1 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.5rem", fontWeight: 700, color: "#0D0D0D" }}>
          일정 캘린더
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            background: "#F56B23",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={16} />
          새 일정
        </button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "0.75rem", padding: "1rem", overflow: "hidden" }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="ko"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          buttonText={{
            today: "오늘",
            month: "월",
            week: "주",
            day: "일",
          }}
          events={events.map(toCalendarEvent)}
          eventClick={handleEventClick}
          height="auto"
          eventDisplay="block"
          dayMaxEvents={3}
        />
      </div>

      {/* Event detail popover */}
      {selectedEvent && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 39 }}
            onClick={() => setSelectedEvent(null)}
          />
          <div
            style={{
              position: "fixed",
              top: Math.min(popoverPos.top, window.innerHeight - 260),
              left: Math.max(8, Math.min(popoverPos.left, window.innerWidth - 308)),
              zIndex: 40,
              background: "#fff",
              border: "1px solid #E8E0C8",
              borderRadius: "0.75rem",
              padding: "1.25rem",
              width: "18rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  {selectedEvent.isImportant && <span style={{ color: "#F56B23" }}>★</span>}
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#0D0D0D" }}>{selectedEvent.title}</h3>
                </div>
                <div
                  style={{
                    display: "inline-block",
                    width: "0.5rem",
                    height: "0.5rem",
                    borderRadius: "50%",
                    background: selectedEvent.color,
                    marginRight: "0.375rem",
                    marginTop: "0.25rem",
                  }}
                />
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: "0" }}
              >
                <X size={16} />
              </button>
            </div>

            {selectedEvent.description && (
              <p style={{ fontSize: "0.875rem", color: "#555", marginBottom: "0.75rem" }}>
                {selectedEvent.description}
              </p>
            )}

            <div style={{ fontSize: "0.8125rem", color: "#555" }}>
              <p style={{ marginBottom: "0.25rem" }}>
                시작: {format(new Date(selectedEvent.startAt), "MM/dd (E) HH:mm", { locale: ko })}
              </p>
              <p style={{ marginBottom: "0.25rem" }}>
                종료: {format(new Date(selectedEvent.endAt), "MM/dd (E) HH:mm", { locale: ko })}
              </p>
              <p style={{ color: "#999" }}>작성자: {selectedEvent.creator.name}</p>
            </div>

            <button
              onClick={() => handleDeleteEvent(selectedEvent.id)}
              style={{
                marginTop: "0.875rem",
                width: "100%",
                padding: "0.375rem",
                border: "1px solid #FDECEA",
                borderRadius: "0.5rem",
                background: "#FDECEA",
                color: "#D93025",
                fontSize: "0.8125rem",
                cursor: "pointer",
              }}
            >
              삭제
            </button>
          </div>
        </>
      )}

      {/* Event create modal */}
      {showCreate && (
        <EventCreateModal
          members={members}
          onCreated={handleEventCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
