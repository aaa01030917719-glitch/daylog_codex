"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { EventClickArg } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Plus, X } from "lucide-react";
import { EventCreateModal } from "@/components/modals/EventCreateModal";

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

async function readError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      return data.error;
    }
  } catch {
    return null;
  }

  return null;
}

export function CalendarClientPage({ initialEvents, members }: Props) {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  function toCalendarEvent(event: Event) {
    return {
      id: event.id,
      title: event.isImportant ? `★ ${event.title}` : event.title,
      start: new Date(event.startAt).toISOString(),
      end: new Date(event.endAt).toISOString(),
      allDay: event.allDay,
      backgroundColor: event.color,
      borderColor: event.color,
      extendedProps: { event },
    };
  }

  function handleEventClick(info: EventClickArg) {
    const rect = info.el.getBoundingClientRect();

    setPopoverPos({
      top: rect.bottom + window.scrollY + 8,
      left: Math.min(rect.left + window.scrollX, window.innerWidth - 300),
    });

    const extendedProps = info.event.extendedProps as { event: Event };
    setSelectedEvent(extendedProps.event);
  }

  async function handleEventCreated(event: Event) {
    setEvents((previous) => [...previous, event]);
    setShowCreate(false);
    calendarRef.current?.getApi().refetchEvents();
  }

  async function handleDeleteEvent(eventId: string) {
    try {
      const response = await fetch(`/api/events/${eventId}`, { method: "DELETE" });

      if (!response.ok) {
        window.alert((await readError(response)) ?? "일정을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      setEvents((previous) => previous.filter((event) => event.id !== eventId));
      setSelectedEvent(null);
    } catch {
      window.alert("일정을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
        }}
      >
        <h1
          style={{
            fontFamily: "Noto Serif KR, serif",
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#0D0D0D",
          }}
        >
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

      <div
        style={{
          background: "#fff",
          border: "1px solid #E8E0C8",
          borderRadius: "0.75rem",
          padding: "1rem",
          overflow: "hidden",
        }}
      >
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

      {selectedEvent ? (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 39 }} onClick={() => setSelectedEvent(null)} />
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
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  {selectedEvent.isImportant ? <span style={{ color: "#F56B23" }}>★</span> : null}
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#0D0D0D" }}>
                    {selectedEvent.title}
                  </h3>
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
                style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: 0 }}
              >
                <X size={16} />
              </button>
            </div>

            {selectedEvent.description ? (
              <p style={{ fontSize: "0.875rem", color: "#555", marginBottom: "0.75rem" }}>
                {selectedEvent.description}
              </p>
            ) : null}

            <div style={{ fontSize: "0.8125rem", color: "#555" }}>
              <p style={{ marginBottom: "0.25rem" }}>
                시작: {format(new Date(selectedEvent.startAt), "MM/dd (E) HH:mm", { locale: ko })}
              </p>
              <p style={{ marginBottom: "0.25rem" }}>
                종료: {format(new Date(selectedEvent.endAt), "MM/dd (E) HH:mm", { locale: ko })}
              </p>
              <p style={{ color: "#999" }}>작성자: {selectedEvent.creator.name ?? "이름 없음"}</p>
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
      ) : null}

      {showCreate ? (
        <EventCreateModal
          members={members}
          onCreated={handleEventCreated}
          onClose={() => setShowCreate(false)}
        />
      ) : null}
    </div>
  );
}
