import React, { useState, useEffect } from 'react';
import { format, addDays, startOfDay, addMinutes, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Users, Plus } from 'lucide-react';

const TIME_SLOTS = [];
for (let i = 9; i <= 22; i++) {
    TIME_SLOTS.push(`${i.toString().padStart(2, '0')}:00`);
    TIME_SLOTS.push(`${i.toString().padStart(2, '0')}:30`);
}

export default function ReservationCalendar({ tables, reservations, onUpdateReservation, onDateChange, selectedDate, onAddReservation }) {
    const [viewMode, setViewMode] = useState('day'); // 'day' | 'month'
    const [currentTime, setCurrentTime] = useState(new Date());

    // Auto-scroll to current time on mount
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const handlePrevDay = () => {
        onDateChange(format(addDays(new Date(selectedDate), -1), 'yyyy-MM-dd'));
    };

    const handleNextDay = () => {
        onDateChange(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-white/20 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
            {/* Calendar Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-20">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-gray-50 rounded-2xl p-1.5 border border-gray-100">
                        <button
                            onClick={() => setViewMode('day')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${viewMode === 'day' ? 'bg-secondary text-white shadow-lg' : 'text-gray-400 hover:text-secondary'}`}
                        >
                            Day View
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${viewMode === 'month' ? 'bg-secondary text-white shadow-lg' : 'text-gray-400 hover:text-secondary'}`}
                        >
                            Month View
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button onClick={handlePrevDay} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors text-secondary">
                        <ChevronLeft size={20} />
                    </button>

                    <div className="flex flex-col items-center">
                        <h2 className="text-xl font-black text-secondary tracking-tight">
                            {format(new Date(selectedDate), 'EEEE, d MMMM yyyy')}
                        </h2>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {reservations.length} Reservations
                        </span>
                    </div>

                    <button onClick={handleNextDay} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors text-secondary">
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-400 rounded-xl text-xs font-black uppercase hover:bg-gray-100 transition-colors">
                        <Filter size={14} /> Filter
                    </button>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {viewMode === 'day' ? (
                    <DayTimeline
                        tables={tables}
                        reservations={reservations}
                        date={selectedDate}
                        timeSlots={TIME_SLOTS}
                        onAddReservation={onAddReservation}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-300 font-bold uppercase tracking-widest">
                        Month View Coming Soon
                    </div>
                )}
            </div>
        </div>
    );
}

function DayTimeline({ tables, reservations, date, timeSlots, onAddReservation }) {
    const [activePopover, setActivePopover] = useState(null);

    const handleReservationClick = (e, reservation) => {
        e.stopPropagation();
        const handleReservationClick = (e, reservation) => {
            e.stopPropagation();
            setActivePopover({ reservation });
        };

        const handleQuickAdd = (tableId, timeSlot) => {
            if (onAddReservation) {
                onAddReservation(tableId, timeSlot);
            }
        };

        const handleDragStart = (e, reservation) => {
            e.dataTransfer.setData('text/plain', JSON.stringify(reservation));
            e.dataTransfer.effectAllowed = 'move';
        };

        const handleDragOver = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        };

        const handleDrop = (e, tableId, timeSlot) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('text/plain');
            if (!data) return;

            const reservation = JSON.parse(data);
            const event = new CustomEvent('reservation-update', {
                detail: { id: reservation.id, table_id: tableId, time_slot: timeSlot }
            });
            window.dispatchEvent(event);
        };

        return (
            <div className="flex-1 overflow-auto custom-scrollbar relative flex bg-gray-50/50">
                {/* Sidebar - Tables */}
                <div className="sticky left-0 z-40 w-48 bg-white border-r border-gray-100 flex-shrink-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                    <div className="h-12 border-b border-gray-100 bg-gray-50 sticky top-0 z-50"></div> {/* Header spacer */}
                    {tables.map(table => (
                        <div key={table.id} className="h-24 border-b border-gray-50 flex flex-col justify-center px-6 relative group hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-black text-secondary text-sm">{table.name}</span>
                                <span className={`w-2 h-2 rounded-full ${table.status === 'Available' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                                <span>{table.capacity} Pax</span>
                                <span>•</span>
                                <span>{table.location}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Time Grid */}
                <div className="flex-1 min-w-max relative">
                    {/* Time Header */}
                    <div className="h-12 border-b border-gray-100 bg-white sticky top-0 z-30 flex">
                        {timeSlots.map(slot => (
                            <div key={slot} className="w-32 flex-shrink-0 border-r border-gray-50 flex items-center justify-center">
                                <span className="text-xs font-bold text-gray-400">{slot}</span>
                            </div>
                        ))}
                    </div>

                    {/* Grid Content */}
                    <div className="relative">
                        {/* Vertical Lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                            {timeSlots.map(slot => (
                                <div key={`line-${slot}`} className="w-32 flex-shrink-0 border-r border-gray-100/50 h-full"></div>
                            ))}
                        </div>

                        {/* Table Rows */}
                        {tables.map((table, tableIndex) => (
                            <div key={`row-${table.id}`} className="h-24 border-b border-gray-100 flex relative group/row">
                                {/* Drop Zones / Quick Add Slots */}
                                {timeSlots.map((slot, i) => (
                                    <div
                                        key={slot}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, table.id, slot)}
                                        onClick={() => handleQuickAdd(table.id, slot)}
                                        className="w-32 h-full absolute top-0 border-r border-transparent hover:bg-primary/5 transition-colors flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer z-10"
                                        style={{ left: `${i * 128}px` }}
                                    >
                                        <button className="w-8 h-8 rounded-full bg-primary text-secondary flex items-center justify-center shadow-lg transform scale-0 group-hover/row:scale-100 transition-transform pointer-events-none">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* Reservations Layer - Higher Z-Index to sit above lines but needs care with drop zones */}
                        {reservations.map(res => {
                            const style = getReservationStyle(res, tables, timeSlots);
                            if (!style) return null;

                            return (
                                <ReservationBlock
                                    key={res.id}
                                    reservation={res}
                                    style={style}
                                    onClick={handleReservationClick}
                                    onDragStart={handleDragStart}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Quick Info Popover */}
                {activePopover && (
                    <QuickInfoPopover
                        reservation={activePopover.reservation}
                        onClose={() => setActivePopover(null)}
                    />
                )}
            </div>
        );
    }

    function ReservationBlock({ reservation, style, onClick, onDragStart }) {
        const isPaid = reservation.deposit_paid;

        return (
            <div
                draggable
                onDragStart={(e) => onDragStart(e, reservation)}
                onClick={(e) => onClick(e, reservation)}
                className={`absolute h-20 top-2 mx-1 rounded-xl p-3 shadow-lg border-l-4 flex flex-col justify-between cursor-pointer hover:brightness-95 transition-all z-20
            ${reservation.status === 'Confirmed' ? 'bg-green-50 border-green-500' :
                        reservation.status === 'Pending Payment' ? 'bg-orange-50 border-orange-500' :
                            'bg-gray-100 border-gray-400'}`}
                style={style}
            >
                <div className="flex justify-between items-start">
                    <span className="font-black text-xs text-secondary truncate">{reservation.customer_name}</span>
                    {isPaid && (
                        <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[8px] text-white font-black">✓</span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                    <Users size={12} />
                    <span>{reservation.guest_count} Guests</span>
                </div>
            </div>
        );
    }

    function QuickInfoPopover({ reservation, onClose }) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-secondary/20 backdrop-blur-sm" onClick={onClose}></div>
                <div className="bg-white rounded-[2rem] shadow-2xl border border-white/20 p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                        &times;
                    </button>

                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h4 className="font-black text-secondary text-2xl mb-1">{reservation.customer_name}</h4>
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${reservation.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {reservation.status}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-2xl">
                        <div className="flex items-center gap-3 text-secondary font-bold">
                            <Users size={16} className="text-primary" />
                            <span>{reservation.guest_count} Guests</span>
                        </div>
                        <div className="flex items-center gap-3 text-secondary font-bold">
                            <span className="w-4 h-4 flex items-center justify-center bg-gray-200 rounded text-[10px]">T</span>
                            <span>{reservation.table_names || `Table ${reservation.table_id}`}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button className="px-4 py-3 bg-green-500 text-white rounded-xl text-sm font-black hover:bg-green-600 transition-colors shadow-lg shadow-green-200">
                            Mark Paid
                        </button>
                        <button className="px-4 py-3 bg-red-50 text-red-500 rounded-xl text-sm font-black hover:bg-red-100 transition-colors border border-red-100">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const getReservationStyle = (reservation, tables, timeSlots) => {
        // 1. Find Row (Y-axis)
        const tableIndex = tables.findIndex(t => {
            // Handle joint tables later, for now check primary table
            return t.id == reservation.table_id || (reservation.assigned_tables && reservation.assigned_tables.find(at => at.id === t.id));
        });

        if (tableIndex === -1) return null;

        // 2. Find Column Start (X-axis)
        // Assumes slots are 30 mins, width 128px
        const SLOT_WIDTH = 128;
        const START_HOUR = 9;

        const [hours, minutes] = reservation.time_slot.split(':').map(Number);
        const startOffsetMinutes = (hours - START_HOUR) * 60 + minutes;
        const startPixel = (startOffsetMinutes / 30) * SLOT_WIDTH;

        // 3. Duration Width
        // Default 2 hours if not specified
        const durationMinutes = 120;
        const widthPixel = (durationMinutes / 30) * SLOT_WIDTH;

        return {
            top: `${tableIndex * 96}px`, // 24rem = 96px height
            left: `${startPixel}px`,
            width: `${widthPixel}px`,
            height: '80px', // 20px padding
        };
    };
