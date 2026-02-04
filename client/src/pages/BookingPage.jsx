import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Armchair, Clock, CheckCircle2 } from 'lucide-react';

export default function BookingPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [slotsLoading, setSlotsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '',
        guests: 2,
        preference: 'Indoor',
        name: '',
        email: '',
        phone: '',
        requests: ''
    });

    const [slots, setSlots] = useState([]);
    const [siteSettings, setSiteSettings] = useState({});

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axios.get('/api/settings');
                setSiteSettings(res.data);
            } catch (err) {
                console.error('Failed to fetch settings', err);
            }
        };
        fetchSettings();
    }, []);

    // Fetch slots whenever date, guests, or preference changes
    useEffect(() => {
        const fetchSlots = async () => {
            setSlotsLoading(true);
            try {
                const res = await axios.get('/api/availability', {
                    params: {
                        date: formData.date,
                        guests: formData.guests,
                        location: formData.preference
                    }
                });
                setSlots(res.data.slots || []);
            } catch (err) {
                console.error('Failed to fetch slots', err);
            } finally {
                setSlotsLoading(false);
            }
        };

        if (formData.date && formData.guests) {
            fetchSlots();
        }
    }, [formData.date, formData.guests, formData.preference]);

    const handleCreateReservation = async (e) => {
        e.preventDefault();
        if (!formData.time) {
            setError('Please select a time slot');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const payload = {
                customer_name: formData.name,
                customer_email: formData.email,
                customer_phone: formData.phone,
                date: formData.date,
                time_slot: formData.time,
                guest_count: Number(formData.guests),
                special_requests: formData.requests,
                seating_preference: formData.preference
            };

            const res = await axios.post('/api/reservations', payload);
            navigate('/confirmation', {
                state: {
                    reservationId: res.data.id,
                    requiresDeposit: res.data.requiresDeposit,
                    depositAmount: res.data.depositAmount,
                    restaurantName: siteSettings.restaurant_name || 'Lumina Dining',
                    ...payload
                }
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create reservation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-white mb-2">Book Your Table</h1>
                <p className="text-gray-500">Secure your spot at {siteSettings.restaurant_name || 'our restaurant'} in just a few clicks.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
                {/* Progress Sidebar */}
                <div className="bg-secondary md:w-64 p-8 text-white hidden md:block">
                    <div className="space-y-8">
                        <div className={`flex items-center gap-4 ${step >= 1 ? 'text-primary' : 'text-gray-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-primary bg-primary text-secondary' : 'border-gray-500'}`}>1</div>
                            <span className="font-bold">Details</span>
                        </div>
                        <div className={`flex items-center gap-4 ${step >= 2 ? 'text-primary' : 'text-gray-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-primary bg-primary text-secondary' : 'border-gray-500'}`}>2</div>
                            <span className="font-bold">Contact</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-8 md:p-12">
                    {step === 1 && (
                        <div className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {/* Date Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        min={format(new Date(), 'yyyy-MM-dd')}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full text-xl font-medium p-4 border-2 border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all cursor-pointer bg-gray-50 hover:bg-white"
                                    />
                                </div>

                                {/* Guest Selection */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                        <User className="w-4 h-4" /> Guests
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={formData.guests}
                                            onChange={e => setFormData({ ...formData, guests: e.target.value })}
                                            className="w-full text-xl font-medium p-4 border-2 border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all bg-gray-50 hover:bg-white"
                                        />
                                        {formData.guests >= (siteSettings.deposit_config?.threshold || 5) && (
                                            <p className="absolute -bottom-6 left-0 text-[10px] text-primary font-bold animate-pulse">
                                                * Deposit payment required for {siteSettings.deposit_config?.threshold || 5}+ guests
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Seating Preference */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                        <Armchair className="w-4 h-4" /> Preference
                                    </label>
                                    <select
                                        value={formData.preference}
                                        onChange={e => setFormData({ ...formData, preference: e.target.value })}
                                        className="w-full text-xl font-medium p-4 border-2 border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all bg-gray-50 hover:bg-white appearance-none"
                                    >
                                        <option value="Indoor">Indoor</option>
                                        <option value="Outdoor">Outdoor</option>
                                    </select>
                                </div>
                            </div>

                            {/* Time Slot Selection (NOW ON SAME PAGE) */}
                            <div className="space-y-4 pt-6 border-t border-gray-100">
                                <label className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Select Time Slot
                                </label>

                                {slotsLoading ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl"></div>)}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                        {slots.map(slot => {
                                            const isToday = formData.date === format(new Date(), 'yyyy-MM-dd');
                                            const [h, m] = slot.time.split(':').map(Number);
                                            const now = new Date();
                                            const isPast = isToday && (h < now.getHours() || (h === now.getHours() && m < now.getMinutes()));
                                            const isAvailable = slot.available && !isPast;

                                            return (
                                                <button
                                                    key={slot.time}
                                                    disabled={!isAvailable}
                                                    onClick={() => setFormData({ ...formData, time: slot.time })}
                                                    className={`p-4 rounded-xl text-lg font-bold transition-all border-2 flex flex-col items-center justify-center gap-1 ${formData.time === slot.time
                                                        ? 'bg-primary border-primary text-secondary shadow-lg scale-105'
                                                        : isAvailable
                                                            ? 'bg-white border-gray-100 hover:border-primary text-secondary'
                                                            : 'bg-gray-50 border-gray-50 text-gray-300 cursor-not-allowed opacity-60'
                                                        }`}
                                                >
                                                    {slot.time}
                                                    {isPast ? (
                                                        <span className="text-[10px] uppercase">Passed</span>
                                                    ) : !slot.available && (
                                                        <span className="text-[10px] uppercase">Full</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {slots.length === 0 && !slotsLoading && (
                                    <p className="text-red-500 font-medium italic">No slots available for this configuration.</p>
                                )}
                            </div>

                            {error && <p className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">{error}</p>}

                            <div className="pt-6">
                                <button
                                    onClick={() => formData.time && setStep(2)}
                                    disabled={!formData.time || slotsLoading}
                                    className="w-full bg-secondary text-primary font-bold py-5 rounded-2xl text-xl hover:bg-black transition-all shadow-xl disabled:opacity-50 disabled:bg-gray-200 disabled:text-gray-400"
                                >
                                    Continue to Contact Details
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleCreateReservation} className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
                            <div className="flex items-center gap-4 mb-4">
                                <button type="button" onClick={() => setStep(1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    &larr; Back to Selection
                                </button>
                                <h2 className="text-2xl font-bold">Your Details</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-400">FullName</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full text-lg p-4 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-400">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full text-lg p-4 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none"
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-400">Phone Number</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full text-lg p-4 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none"
                                        placeholder="+62 812..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-400">Special Requests</label>
                                <textarea
                                    rows="3"
                                    value={formData.requests}
                                    onChange={e => setFormData({ ...formData, requests: e.target.value })}
                                    className="w-full text-lg p-4 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none"
                                    placeholder="e.g. Birthday surprise, Window seat preferred..."
                                ></textarea>
                            </div>

                            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-start gap-4">
                                <CheckCircle2 className="text-primary w-6 h-6 mt-1" />
                                <div>
                                    <h3 className="font-bold text-secondary">Ready to book!</h3>
                                    <p className="text-sm text-gray-600">
                                        Reservation for <span className="font-bold">{formData.guests} people</span> on
                                        <span className="font-bold"> {formData.date}</span> at
                                        <span className="font-bold"> {formData.time}</span>.
                                    </p>
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-sm">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-secondary font-black py-5 rounded-2xl text-xl hover:bg-yellow-500 transition-all shadow-xl disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Complete Reservation'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
