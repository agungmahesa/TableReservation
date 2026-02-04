import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    Calendar, Users, LayoutGrid, LogOut, QrCode, Settings,
    Plus, Edit2, Trash2, CheckCircle, XCircle, Info, ExternalLink, DollarSign, CalendarRange
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import ReservationCalendar from '../components/admin/ReservationCalendar';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'Staff');
    const [activeTab, setActiveTab] = useState('reservations');
    const [activeConfigTab, setActiveConfigTab] = useState('general');
    const [reservations, setReservations] = useState([]);
    const [tables, setTables] = useState([]);
    const [menu, setMenu] = useState([]);
    const [siteSettings, setSiteSettings] = useState({});
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [loading, setLoading] = useState(true);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadingMenuImage, setUploadingMenuImage] = useState(false);

    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingAboutImage, setUploadingAboutImage] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);
    const logoInputRef = useRef(null);
    const aboutInputRef = useRef(null);
    const menuImageInputRef = useRef(null);

    // Forms
    const [menuForm, setMenuForm] = useState({ name: '', description: '', image_url: '', price: '', category: '' });
    const [editingMenuId, setEditingMenuId] = useState(null);
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Table CRUD States
    const [tableForm, setTableForm] = useState({ name: '', capacity: '', location: 'Indoor', type: 'Standard', status: 'Available', is_joinable: true });
    const [editingTableId, setEditingTableId] = useState(null);
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);
    const [tableToDelete, setTableToDelete] = useState(null);

    // Reservation CRUD States
    const [reservationForm, setReservationForm] = useState({
        customer_name: '', customer_email: '', customer_phone: '',
        date: '', time_slot: '', guest_count: 2, special_requests: '',
        status: 'Confirmed', table_id: ''
    });
    const [editingReservationId, setEditingReservationId] = useState(null);
    const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
    const [reservationToDelete, setReservationToDelete] = useState(null);
    const [depositToUpdate, setDepositToUpdate] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) navigate('/login');

        fetchData();

        // Listen for Calendar DnD updates
        const handleReservationUpdate = async (e) => {
            const { id, table_id, time_slot } = e.detail;
            // Optimistic update or just call API
            try {
                // Determine status logic if needed, but for moving we just patch basic info
                await axios.patch(`/api/admin/reservations/${id}`, {
                    table_id,
                    time_slot
                });
                fetchData(); // Refresh to sync
            } catch (err) {
                console.error("Failed to move reservation", err);
                alert("Failed to move reservation. Please try again.");
            }
        };

        window.addEventListener('reservation-update', handleReservationUpdate);
        return () => window.removeEventListener('reservation-update', handleReservationUpdate);
    }, [navigate, selectedDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resReq, tablesReq, menuReq, settingsReq] = await Promise.all([
                axios.get(`/api/admin/reservations?date=${selectedDate}`),
                axios.get('/api/admin/tables'),
                axios.get('/api/admin/menu'),
                axios.get('/api/settings')
            ]);
            setReservations(resReq.data);
            setTables(tablesReq.data);
            setMenu(menuReq.data);
            setSiteSettings(settingsReq.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updateReservationStatus = async (id, status) => {
        try {
            await axios.patch(`/api/admin/reservations/${id}`, { status });
            fetchData();
            if (selectedReservation?.id === id) {
                setSelectedReservation(prev => ({ ...prev, status }));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveSettings = async () => {
        try {
            // Validate settings before saving
            const settingsToSave = {
                ...siteSettings,
                restaurant_hours: {
                    open: siteSettings.restaurant_hours?.open || '12:00',
                    close: siteSettings.restaurant_hours?.close || '22:00',
                    interval: siteSettings.restaurant_hours?.interval || 30
                },
                deposit_config: {
                    threshold: siteSettings.deposit_config?.threshold || 5,
                    amount: siteSettings.deposit_config?.amount || 100000,
                    bank_info: siteSettings.deposit_config?.bank_info || ''
                }
            };

            await axios.post('/api/admin/settings', settingsToSave);
            alert('Configuration saved successfully!');
            fetchData(); // Refresh data
        } catch (err) {
            console.error('Error saving settings:', err);
            alert('Failed to save configuration. Please try again.');
        }
    };

    const handleMenuSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingMenuId) {
                await axios.patch(`/api/admin/menu/${editingMenuId}`, menuForm);
            } else {
                await axios.post('/api/admin/menu', menuForm);
            }
            setMenuForm({ name: '', description: '', image_url: '', price: '', category: '' });
            setEditingMenuId(null);
            setIsMenuModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || 'Failed to save menu item';
            alert(errorMsg);
        }
    };

    const deleteMenuItem = async () => {
        if (!itemToDelete) return;
        try {
            await axios.delete(`/api/admin/menu/${itemToDelete.id}`);
            setItemToDelete(null);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to delete item.');
        }
    };

    const handleTableSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTableId) {
                await axios.patch(`/api/admin/tables/${editingTableId}`, tableForm);
            } else {
                await axios.post('/api/admin/tables', tableForm);
            }
            setTableForm({ name: '', capacity: '', location: 'Indoor', status: 'Available' });
            setEditingTableId(null);
            setIsTableModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to save table.');
        }
    };

    const deleteTable = async () => {
        if (!tableToDelete) return;
        try {
            await axios.delete(`/api/admin/tables/${tableToDelete.id}`);
            setTableToDelete(null);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to delete table: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleReservationSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingReservationId) {
                await axios.patch(`/api/admin/reservations/${editingReservationId}`, reservationForm);
            } else {
                await axios.post('/api/admin/reservations', reservationForm);
            }
            setIsReservationModalOpen(false);
            setEditingReservationId(null);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to save reservation: ' + (err.response?.data?.error || err.message));
        }
    };

    const updateDepositStatus = async () => {
        if (!depositToUpdate) return;
        try {
            await axios.patch(`/api/admin/reservations/deposit/${depositToUpdate.id}`, {
                deposit_paid: !depositToUpdate.deposit_paid
            });
            fetchData();
            setDepositToUpdate(null);
        } catch (err) {
            console.error(err);
            alert('Failed to update deposit status');
        }
    };

    const deleteReservation = async () => {
        if (!reservationToDelete) return;
        try {
            await axios.delete(`/api/admin/reservations/${reservationToDelete.id}`);
            setReservationToDelete(null);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Failed to delete reservation.');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/login');
    };

    const handleHeroImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        setUploadProgress(0);
        try {
            const res = await axios.post('/api/admin/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                }
            });
            setSiteSettings({ ...siteSettings, hero_image: res.url || res.data.url });
            alert('Image uploaded! Remember to click "Update Configuration" to save changes.');
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || err.message;
            const detailMsg = err.response?.data?.details ? ` (${err.response.data.details})` : '';
            alert('Upload failed: ' + errorMsg + detailMsg);
        } finally {
            setUploading(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploadingLogo(true);
        setUploadProgress(0);
        try {
            const res = await axios.post('/api/admin/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                }
            });
            setSiteSettings({ ...siteSettings, restaurant_logo: res.url || res.data.url });
            alert('Logo uploaded! Remember to click "Update Configuration" to save changes.');
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || err.message;
            const detailMsg = err.response?.data?.details ? ` (${err.response.data.details})` : '';
            alert('Upload failed: ' + errorMsg + detailMsg);
        } finally {
            setUploadingLogo(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    const handleAboutImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploadingAboutImage(true);
        setUploadProgress(0);
        try {
            const res = await axios.post('/api/admin/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                }
            });
            setSiteSettings({ ...siteSettings, about_image: res.url || res.data.url });
            alert('About Image uploaded! Remember to click "Update CMS Content" to save changes.');
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || err.message;
            const detailMsg = err.response?.data?.details ? ` (${err.response.data.details})` : '';
            alert('Upload failed: ' + errorMsg + detailMsg);
        } finally {
            setUploadingAboutImage(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };


    const handleMenuImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploadingMenuImage(true);
        setUploadProgress(0);
        try {
            const res = await axios.post('/api/admin/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                }
            });
            const imageUrl = res.data.url || res.url;
            setMenuForm(prev => ({ ...prev, image_url: imageUrl }));
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.error || err.message;
            const detailMsg = err.response?.data?.details ? ` (${err.response.data.details})` : '';
            alert('Upload failed: ' + errorMsg + detailMsg);
        } finally {
            setUploadingMenuImage(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    };

    // QR Scanner Component Support
    useEffect(() => {
        if (activeTab === 'scanner') {
            const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 });
            scanner.render((decodedText) => {
                // Expected format LUMINA-ID
                const id = decodedText.split('-')[1];
                if (id) {
                    scanner.clear();
                    // Find and show reservation
                    fetchReservationById(id);
                }
            }, (error) => {
                // console.warn(error);
            });
            return () => scanner.clear();
        }
    }, [activeTab]);

    const fetchReservationById = async (id) => {
        try {
            const res = await axios.get(`/api/reservations/${id}`);
            setSelectedReservation(res.data);
            setActiveTab('reservations');
        } catch (err) {
            alert('Reservation not found or error occurred.');
        }
    };

    const handleCalendarQuickAdd = (tableId, timeSlot) => {
        setEditingReservationId(null);
        setReservationForm({
            customer_name: '', customer_email: '', customer_phone: '',
            date: selectedDate,
            time_slot: timeSlot,
            guest_count: 2,
            special_requests: '',
            status: 'Confirmed',
            table_id: tableId
        });
        setIsReservationModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex text-secondary font-sans relative">
            {/* Global upload progress bar */}
            {(uploadProgress > 0) && (
                <div className="fixed top-0 left-0 right-0 z-[100] h-1.5 bg-gray-100 overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                    />
                    <div className="fixed top-4 right-8 bg-black/80 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md animate-pulse">
                        Uploading {uploadProgress}%
                    </div>
                </div>
            )}
            {/* Sidebar */}
            <aside className="w-64 bg-secondary text-white p-6 hidden md:flex flex-col border-r border-white/5 shadow-2xl z-20">
                <div className="flex items-center justify-center mb-10 px-2 overflow-hidden min-h-[40px]">
                    {siteSettings.restaurant_logo ? (
                        <img src={siteSettings.restaurant_logo} alt="Logo" className="h-10 w-auto object-contain rounded-md" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="bg-primary p-2 rounded-lg text-secondary">
                                <LayoutGrid size={24} />
                            </div>
                            <h1 className="text-xl font-black tracking-tight truncate">{siteSettings.restaurant_name || 'Admin'}</h1>
                        </div>
                    )}
                </div>

                <nav className="flex-1 space-y-2">
                    {[
                        { id: 'reservations', icon: Calendar, label: 'Reservations' },
                        { id: 'calendar', icon: CalendarRange, label: 'Calendar View' },
                        { id: 'scanner', icon: QrCode, label: 'Scan Guest QR' },
                        { id: 'tables', icon: Users, label: 'Table Layout' },
                        { id: 'config', icon: Settings, label: 'Configuration' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === tab.id ? 'bg-primary text-secondary font-bold shadow-lg shadow-primary/20 scale-105' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                            <tab.icon size={20} /> {tab.label}
                        </button>
                    ))}
                </nav>

                <button onClick={handleLogout} className="flex items-center gap-3 text-white/40 hover:text-red-400 transition-colors mt-auto px-4 py-3 border-t border-white/5">
                    <LogOut size={20} /> Sign Out
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto h-screen relative scroll-smooth bg-[#f8f9fc]">
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-6 flex justify-between items-center z-10 shadow-sm">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-black text-secondary capitalize">{activeTab}</h2>
                        {activeTab === 'reservations' && (
                            <span className="text-sm font-bold px-3 py-1 bg-gray-100 rounded-full text-gray-500">{reservations.length} total</span>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {activeTab === 'reservations' && (
                            <>
                                <button
                                    onClick={() => {
                                        setEditingReservationId(null);
                                        setReservationForm({
                                            customer_name: '', customer_email: '', customer_phone: '',
                                            date: selectedDate, time_slot: '18:00', guest_count: 2, special_requests: '',
                                            status: 'Confirmed', table_id: tables[0]?.id || ''
                                        });
                                        setIsReservationModalOpen(true);
                                    }}
                                    className="px-4 py-2 bg-primary text-secondary rounded-xl font-bold flex items-center gap-2 hover:bg-yellow-500 transition-all shadow-lg shadow-primary/10"
                                >
                                    <Plus size={18} /> New
                                </button>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold"
                                />
                            </>
                        )}
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border-2 border-primary/10">A</div>
                    </div>
                </header>

                <div className="p-8">
                    {activeTab === 'reservations' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-6 py-5 text-xs font-black uppercase text-gray-400 tracking-widest">Time</th>
                                            <th className="px-6 py-5 text-xs font-black uppercase text-gray-400 tracking-widest">Guest</th>
                                            <th className="px-6 py-5 text-xs font-black uppercase text-gray-400 tracking-widest text-center">Size</th>
                                            <th className="px-6 py-5 text-xs font-black uppercase text-gray-400 tracking-widest">Location</th>
                                            <th className="px-6 py-5 text-xs font-black uppercase text-gray-400 tracking-widest text-center">Status</th>
                                            <th className="px-6 py-5 text-xs font-black uppercase text-gray-400 tracking-widest text-center">Deposit</th>
                                            <th className="px-6 py-5 text-xs font-black uppercase text-gray-400 tracking-widest text-right px-10">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {reservations.length === 0 ? (
                                            <tr><td colSpan="7" className="px-6 py-16 text-center text-gray-400 font-medium italic">No reservations for this date.</td></tr>
                                        ) : (
                                            reservations.map(res => (
                                                <tr key={res.id} className="hover:bg-primary/5 transition-colors group">
                                                    <td className="px-6 py-6 font-black text-lg text-secondary">{res.time_slot}</td>
                                                    <td className="px-6 py-6">
                                                        <h4 className="font-bold text-secondary group-hover:text-primary transition-colors">{res.customer_name}</h4>
                                                        <p className="text-xs text-gray-400 font-medium tracking-tight mt-0.5">{res.customer_phone}</p>
                                                    </td>
                                                    <td className="px-6 py-6 text-center">
                                                        <span className="inline-flex items-center gap-1.5 font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full text-xs">
                                                            <Users size={12} /> {res.guest_count}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-gray-700">{res.table_names || res.table_name || 'Unassigned'}</span>
                                                            <span className="text-[10px] uppercase font-black text-gray-400">{res.seating_preference}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6 text-center">
                                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${res.status === 'Confirmed' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                            res.status === 'Cancelled' ? 'bg-red-50 text-red-500 border border-red-100' :
                                                                res.status === 'Pending Payment' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                                    'bg-blue-50 text-blue-600 border border-blue-100'
                                                            }`}>
                                                            {res.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-6 text-center">
                                                        {res.deposit_required ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <button
                                                                    onClick={() => setDepositToUpdate(res)}
                                                                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all cursor-pointer hover:scale-105 ${res.deposit_paid ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                                                                >
                                                                    {res.deposit_paid ? '✓ Paid' : 'Mark Paid'}
                                                                </button>
                                                                <span className="text-[9px] text-gray-400 font-bold">
                                                                    Rp {(siteSettings.deposit_config?.amount || 100000).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 font-medium">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-6 text-right space-x-2 whitespace-nowrap px-10">
                                                        <button
                                                            onClick={() => setSelectedReservation(res)}
                                                            className="p-2.5 rounded-xl bg-gray-100 text-gray-400 hover:bg-secondary hover:text-white transition-all shadow-sm"
                                                            title="Details"
                                                        >
                                                            <Info size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingReservationId(res.id);
                                                                setReservationForm(res);
                                                                setIsReservationModalOpen(true);
                                                            }}
                                                            className="p-2.5 rounded-xl bg-gray-100 text-gray-400 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setReservationToDelete(res)}
                                                            className="p-2.5 rounded-xl bg-gray-100 text-gray-400 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        {res.status === 'Pending Payment' && (
                                                            <button
                                                                onClick={() => updateReservationStatus(res.id, 'Confirmed')}
                                                                className="p-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-all shadow-sm"
                                                                title="Confirm Payment"
                                                            >
                                                                <CheckCircle size={14} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                    }

                    {
                        activeTab === 'scanner' && (
                            <div className="max-w-xl mx-auto space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100">
                                    <div className="flex justify-center mb-8">
                                        <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary">
                                            <QrCode size={40} />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black mb-2">Scan Guest Token</h3>
                                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">Use the camera to scan the QR code from the guest's digital or printed ticket.</p>
                                    <div id="qr-reader" className="overflow-hidden rounded-3xl border-4 border-gray-100 bg-gray-50"></div>
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'config' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {/* Configuration Tabs */}
                                <div className="flex justify-center bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 max-w-fit mx-auto sticky top-24 z-10 backdrop-blur-md bg-white/80">
                                    <button
                                        onClick={() => setActiveConfigTab('general')}
                                        className={`px-8 py-3 rounded-xl font-bold transition-all ${activeConfigTab === 'general' ? 'bg-secondary text-white shadow-lg' : 'text-gray-400 hover:text-secondary hover:bg-gray-50'}`}
                                    >General Information</button>
                                    <button
                                        onClick={() => setActiveConfigTab('cms')}
                                        className={`px-8 py-3 rounded-xl font-bold transition-all ${activeConfigTab === 'cms' ? 'bg-secondary text-white shadow-lg' : 'text-gray-400 hover:text-secondary hover:bg-gray-50'}`}
                                    >CMS & Content</button>
                                </div>

                                {activeConfigTab === 'general' && (
                                    <div className="max-w-2xl mx-auto space-y-8">
                                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                            <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                                                <Settings className="text-primary" /> Operational Settings
                                            </h3>

                                            <div className="space-y-8">
                                                {/* Restaurant Name */}
                                                <div>
                                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2 block">Restaurant Name</label>
                                                    <input
                                                        type="text"
                                                        value={siteSettings.restaurant_name || ''}
                                                        onChange={e => setSiteSettings({ ...siteSettings, restaurant_name: e.target.value })}
                                                        placeholder="Your Restaurant Name"
                                                        className="w-full bg-gray-50 p-4 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                                    />
                                                    <p className="text-[10px] text-gray-400 mt-2 font-medium italic">This name will appear on the Landing Page, Admin Panel, and Booking confirmation.</p>
                                                </div>

                                                {/* Restaurant Logo */}
                                                <div>
                                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2 block">Restaurant Logo</label>
                                                    <div className="space-y-4">
                                                        {siteSettings.restaurant_logo && (
                                                            <div className="relative group rounded-2xl overflow-hidden w-40 h-40 border border-gray-100 shadow-inner bg-gray-50 mx-auto md:mx-0">
                                                                <img src={siteSettings.restaurant_logo} className="w-full h-full object-contain p-4" alt="Logo" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <button onClick={() => logoInputRef.current?.click()} className="bg-white text-secondary p-2 rounded-full font-bold text-xs"><Edit2 size={16} /></button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {!siteSettings.restaurant_logo && (
                                                            <div onClick={() => logoInputRef.current?.click()} className="w-40 h-40 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors mx-auto md:mx-0">
                                                                <Plus className="text-gray-400 mb-2" />
                                                                <span className="text-[10px] font-bold text-gray-400">Upload Logo</span>
                                                            </div>
                                                        )}
                                                        <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                                                        {uploadingLogo && <p className="text-[10px] font-bold text-primary animate-pulse">Uploading...</p>}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2 block">Opening Time</label>
                                                        <input type="time" value={siteSettings.restaurant_hours?.open || '12:00'} onChange={e => setSiteSettings({ ...siteSettings, restaurant_hours: { ...siteSettings.restaurant_hours, open: e.target.value } })} className="w-full bg-gray-50 p-4 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2 block">Closing Time</label>
                                                        <input type="time" value={siteSettings.restaurant_hours?.close || '22:00'} onChange={e => setSiteSettings({ ...siteSettings, restaurant_hours: { ...siteSettings.restaurant_hours, close: e.target.value } })} className="w-full bg-gray-50 p-4 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold" />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2 block">Reservation Interval (Minutes)</label>
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {[15, 30, 60, 90, 120].map(int => (
                                                            <button
                                                                key={int}
                                                                onClick={() => setSiteSettings({ ...siteSettings, restaurant_hours: { ...siteSettings.restaurant_hours, interval: int } })}
                                                                className={`p-3 rounded-xl text-center text-sm font-bold border transition-all ${siteSettings.restaurant_hours?.interval === int ? 'bg-primary text-secondary border-primary' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-primary'}`}
                                                            >
                                                                {int}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="border-t border-gray-100 pt-8">
                                                    <h4 className="text-sm font-black uppercase text-secondary mb-4">Financial & Deposit</h4>
                                                    <div className="grid grid-cols-2 gap-6 mb-4">
                                                        <div>
                                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2 block">Min Deposit (IDR)</label>
                                                            <input type="number" value={siteSettings.deposit_config?.amount || 100000} onChange={e => setSiteSettings({ ...siteSettings, deposit_config: { ...siteSettings.deposit_config, amount: Number(e.target.value) } })} className="w-full bg-gray-50 p-4 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2 block">Group Size Threshold</label>
                                                            <input type="number" value={siteSettings.deposit_config?.threshold || 5} onChange={e => setSiteSettings({ ...siteSettings, deposit_config: { ...siteSettings.deposit_config, threshold: Number(e.target.value) } })} className="w-full bg-gray-50 p-4 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold" />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2 block">Bank Information</label>
                                                        <textarea value={siteSettings.deposit_config?.bank_info || ''} onChange={e => setSiteSettings({ ...siteSettings, deposit_config: { ...siteSettings.deposit_config, bank_info: e.target.value } })} className="w-full bg-gray-50 p-4 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold h-24" placeholder="Bank BCA 1234567890 a.n PT Lumina"></textarea>
                                                    </div>
                                                </div>

                                                <button onClick={handleSaveSettings} className="w-full bg-secondary text-primary py-4 rounded-2xl font-black hover:bg-black transition-all shadow-xl">Update General Information</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeConfigTab === 'cms' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-1 space-y-8">
                                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                                <h3 className="text-xl font-black mb-6 flex items-center gap-3"><LayoutGrid className="text-primary" /> Landing Page Content</h3>
                                                <div className="space-y-6">
                                                    {/* Hero */}
                                                    <div>
                                                        <span className="text-xs font-black uppercase bg-gray-100 px-2 py-1 rounded text-gray-500 mb-4 inline-block">Hero Section</span>
                                                        <div className="space-y-4">
                                                            <input type="text" value={siteSettings.hero_title || ''} onChange={e => setSiteSettings({ ...siteSettings, hero_title: e.target.value })} className="w-full bg-gray-50 p-3 rounded-xl border-gray-100 text-sm font-bold placeholder-gray-300" placeholder="Title" />
                                                            <input type="text" value={siteSettings.hero_highlight || ''} onChange={e => setSiteSettings({ ...siteSettings, hero_highlight: e.target.value })} className="w-full bg-gray-50 p-3 rounded-xl border-gray-100 text-sm font-bold placeholder-gray-300" placeholder="Highlight Text" />
                                                            <textarea value={siteSettings.hero_subtitle || ''} onChange={e => setSiteSettings({ ...siteSettings, hero_subtitle: e.target.value })} className="w-full bg-gray-50 p-3 rounded-xl border-gray-100 text-sm font-bold placeholder-gray-300 h-20" placeholder="Subtitle"></textarea>
                                                            {/* Hero Image */}
                                                            <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-100">
                                                                <img src={siteSettings.hero_image || 'https://via.placeholder.com/400'} className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                                                    <span className="text-white text-xs font-bold">Change Image</span>
                                                                </div>
                                                            </div>
                                                            <input type="file" ref={fileInputRef} onChange={handleHeroImageUpload} className="hidden" accept="image/*" />
                                                        </div>
                                                    </div>

                                                    {/* About */}
                                                    <div className="border-t border-gray-100 pt-6">
                                                        <span className="text-xs font-black uppercase bg-gray-100 px-2 py-1 rounded text-gray-500 mb-4 inline-block">About Section</span>
                                                        <div className="space-y-4">
                                                            <input type="text" value={siteSettings.about_title || ''} onChange={e => setSiteSettings({ ...siteSettings, about_title: e.target.value })} className="w-full bg-gray-50 p-3 rounded-xl border-gray-100 text-sm font-bold placeholder-gray-300" placeholder="Title" />
                                                            <textarea value={siteSettings.about_content || ''} onChange={e => setSiteSettings({ ...siteSettings, about_content: e.target.value })} className="w-full bg-gray-50 p-3 rounded-xl border-gray-100 text-sm font-bold placeholder-gray-300 h-24" placeholder="Content"></textarea>

                                                            {/* About Image Upload */}
                                                            <div className="space-y-4">
                                                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1 block">Image (Optional)</label>
                                                                {siteSettings.about_image && (
                                                                    <div className="relative group rounded-xl overflow-hidden aspect-video border border-gray-100 shadow-sm w-full">
                                                                        <img src={siteSettings.about_image} className="w-full h-full object-cover" alt="About Preview" />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <button onClick={() => aboutInputRef.current?.click()} className="bg-white text-secondary px-4 py-2 rounded-full font-bold text-xs shadow-lg">Change Image</button>
                                                                            <button onClick={() => setSiteSettings({ ...siteSettings, about_image: '' })} className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-xs shadow-lg ml-2">Remove</button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {!siteSettings.about_image && (
                                                                    <div onClick={() => aboutInputRef.current?.click()} className="w-full h-24 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                                                                        <Plus className="text-gray-400 mb-1" />
                                                                        <span className="text-[10px] font-bold text-gray-400">Upload About Image</span>
                                                                    </div>
                                                                )}
                                                                <input type="file" ref={aboutInputRef} onChange={handleAboutImageUpload} className="hidden" accept="image/*" />
                                                                {uploadingAboutImage && <p className="text-[10px] font-bold text-primary animate-pulse">Uploading...</p>}
                                                            </div>

                                                            <p className="text-[10px] text-gray-400 font-bold">Leave image empty to automatically use the Centered Text layout.</p>
                                                        </div>
                                                    </div>

                                                    {/* Location */}
                                                    <div className="border-t border-gray-100 pt-6">
                                                        <span className="text-xs font-black uppercase bg-gray-100 px-2 py-1 rounded text-gray-500 mb-4 inline-block">Location</span>
                                                        <div className="space-y-4">
                                                            <textarea value={siteSettings.location_address || ''} onChange={e => setSiteSettings({ ...siteSettings, location_address: e.target.value })} className="w-full bg-gray-50 p-3 rounded-xl border-gray-100 text-sm font-bold placeholder-gray-300 h-20" placeholder="Address"></textarea>
                                                            <input type="text" value={siteSettings.location_map_url || ''} onChange={e => setSiteSettings({ ...siteSettings, location_map_url: e.target.value })} className="w-full bg-gray-50 p-3 rounded-xl border-gray-100 text-sm font-bold placeholder-gray-300" placeholder="Map URL" />
                                                        </div>
                                                    </div>

                                                    <button onClick={handleSaveSettings} className="w-full bg-secondary text-primary py-4 rounded-2xl font-black hover:bg-black transition-all shadow-xl">Update CMS Content</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="lg:col-span-2 space-y-8">
                                            {/* Menu Management Component (Reused) */}
                                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                                <div className="flex justify-between items-center mb-8">
                                                    <h3 className="text-xl font-black flex items-center gap-3">
                                                        <LayoutGrid className="text-primary" /> Menu Management
                                                    </h3>
                                                    <button onClick={() => { setEditingMenuId(null); setMenuForm({ name: '', description: '', image_url: '', price: '', category: '' }); setIsMenuModalOpen(true); }} className="px-6 py-2 bg-primary text-secondary rounded-xl font-bold flex items-center gap-2 hover:bg-yellow-500 transition-all shadow-lg shadow-primary/10">
                                                        <Plus size={18} /> Add Item
                                                    </button>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    {menu.map(item => (
                                                        <div key={item.id} className="flex gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:border-primary transition-colors">
                                                            <img src={item.image_url} className="w-20 h-20 rounded-xl object-cover" />
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-bold truncate">{item.name}</h4>
                                                                <p className="text-primary font-black text-sm">Rp {item.price.toLocaleString()}</p>
                                                                <div className="flex gap-2 mt-2">
                                                                    <button onClick={() => { setEditingMenuId(item.id); setMenuForm(item); setIsMenuModalOpen(true); }} className="p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:bg-blue-500 hover:text-white"><Edit2 size={14} /></button>
                                                                    <button onClick={() => setItemToDelete(item)} className="p-1.5 bg-gray-100 rounded-lg text-gray-500 hover:bg-red-500 hover:text-white"><Trash2 size={14} /></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    }


                    {
                        activeTab === 'calendar' && (
                            userRole === 'Staff' ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] shadow-xl border border-white/20">
                                    <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                        <CalendarRange size={48} className="text-primary" />
                                    </div>
                                    <h2 className="text-3xl font-black text-secondary mb-2 uppercase tracking-tighter text-center">Calendar View</h2>
                                    <div className="px-4 py-1 bg-secondary text-surface text-[10px] font-black uppercase tracking-widest rounded-full mb-6">
                                        Coming Soon
                                    </div>
                                    <p className="text-gray-400 font-bold text-center max-w-sm leading-relaxed">
                                        We are currently finalizing the intelligent scheduling system for your staff account. Stay tuned for advanced reservation management.
                                    </p>
                                </div>
                            ) : (
                                <ReservationCalendar
                                    tables={tables}
                                    reservations={reservations}
                                    selectedDate={selectedDate}
                                    onDateChange={setSelectedDate}
                                    onUpdateReservation={fetchData}
                                    onAddReservation={handleCalendarQuickAdd}
                                />
                            )
                        )
                    }

                    {
                        activeTab === 'tables' && (
                            <div className="space-y-8">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-black flex items-center gap-3">
                                        <Users className="text-primary" /> Manage Tables
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setEditingTableId(null);
                                            setTableForm({ name: '', capacity: '', location: 'Indoor', type: 'Standard', status: 'Available' });
                                            setIsTableModalOpen(true);
                                        }}
                                        className="px-6 py-2 bg-primary text-secondary rounded-xl font-bold flex items-center gap-2 hover:bg-yellow-500 transition-all shadow-lg shadow-primary/10"
                                    >
                                        <Plus size={18} /> Add New Table
                                    </button>
                                </div>

                                {/* Joinable Tables Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl border border-green-200">
                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                            <span className="text-sm font-black text-green-700 uppercase tracking-wider">Joinable Tables</span>
                                        </div>
                                        <span className="text-xs text-gray-400 font-bold">Can be combined for large parties</span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                        {tables.filter(t => t.is_joinable === 1).map(table => (
                                            <div key={table.id} className={`group relative aspect-square p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center text-center gap-2 ${table.status === 'Available' ? 'bg-white border-green-100 hover:border-green-500 text-secondary' : 'bg-gray-100 border-gray-200 text-gray-400 opacity-50'}`}>
                                                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingTableId(table.id);
                                                            setTableForm(table);
                                                            setIsTableModalOpen(true);
                                                        }}
                                                        className="p-1.5 bg-white shadow-sm rounded-lg text-gray-400 hover:text-blue-500"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTableToDelete(table);
                                                        }}
                                                        className="p-1.5 bg-white shadow-sm rounded-lg text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <Users size={24} className={table.status === 'Available' ? 'text-green-500' : 'text-gray-400'} />
                                                <div>
                                                    <h4 className="font-black text-xs uppercase tracking-tighter">{table.name}</h4>
                                                    <p className="text-[10px] font-bold">Cap: {table.capacity}</p>
                                                </div>
                                                <span className="text-[8px] font-black uppercase text-gray-400">{table.location}</span>
                                            </div>
                                        ))}
                                        {tables.filter(t => t.is_joinable === 1).length === 0 && (
                                            <div className="col-span-full text-center py-8 text-gray-400 text-sm font-medium italic">
                                                No joinable tables configured
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Non-Joinable Tables Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
                                            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                            <span className="text-sm font-black text-amber-700 uppercase tracking-wider">Non-Joinable Tables</span>
                                        </div>
                                        <span className="text-xs text-gray-400 font-bold">Standalone only (VIP, Booth)</span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                        {tables.filter(t => t.is_joinable === 0).map(table => (
                                            <div key={table.id} className={`group relative aspect-square p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center text-center gap-2 ${table.status === 'Available' ? 'bg-white border-amber-100 hover:border-amber-500 text-secondary' : 'bg-gray-100 border-gray-200 text-gray-400 opacity-50'}`}>
                                                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingTableId(table.id);
                                                            setTableForm(table);
                                                            setIsTableModalOpen(true);
                                                        }}
                                                        className="p-1.5 bg-white shadow-sm rounded-lg text-gray-400 hover:text-blue-500"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setTableToDelete(table);
                                                        }}
                                                        className="p-1.5 bg-white shadow-sm rounded-lg text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                                <Users size={24} className={table.status === 'Available' ? 'text-amber-500' : 'text-gray-400'} />
                                                <div>
                                                    <h4 className="font-black text-xs uppercase tracking-tighter">{table.name}</h4>
                                                    <p className="text-[10px] font-bold">Cap: {table.capacity}</p>
                                                </div>
                                                <span className="text-[8px] font-black uppercase text-gray-400">{table.location}</span>
                                            </div>
                                        ))}
                                        {tables.filter(t => t.is_joinable === 0).length === 0 && (
                                            <div className="col-span-full text-center py-8 text-gray-400 text-sm font-medium italic">
                                                No non-joinable tables configured
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div >

                {/* Detail Modal */}
                {
                    selectedReservation && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-secondary/80 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                                <div className="bg-secondary p-10 text-white relative">
                                    <button
                                        onClick={() => setSelectedReservation(null)}
                                        className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all font-bold"
                                    >
                                        &times;
                                    </button>
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-secondary font-black text-2xl">
                                            #{selectedReservation.id}
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black mb-1">{selectedReservation.customer_name}</h3>
                                            <div className="flex items-center gap-4 text-white/50 text-sm font-bold uppercase tracking-widest">
                                                <span>{selectedReservation.date}</span>
                                                <span>•</span>
                                                <span>{selectedReservation.time_slot}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-10 space-y-8">
                                    <div className="grid grid-cols-2 gap-10">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Guests</label>
                                            <p className="text-xl font-black flex items-center gap-2">
                                                <Users className="text-primary" /> {selectedReservation.guest_count} People
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Preference</label>
                                            <p className="text-xl font-black text-secondary">{selectedReservation.seating_preference}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Contact Information</label>
                                        <p className="text-lg font-bold text-secondary">{selectedReservation.customer_email}</p>
                                        <p className="text-lg font-bold text-secondary">{selectedReservation.customer_phone}</p>
                                    </div>

                                    {selectedReservation.special_requests && (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Special Requests</label>
                                            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 italic text-gray-600 font-medium">
                                                "{selectedReservation.special_requests}"
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 flex gap-4">
                                        <button
                                            onClick={() => setSelectedReservation(null)}
                                            className="flex-1 bg-gray-100 text-gray-600 py-5 rounded-[2rem] font-black hover:bg-gray-200 transition-all"
                                        >
                                            Close Detail
                                        </button>
                                        {selectedReservation.status !== 'Completed' && (
                                            <button
                                                onClick={() => { updateReservationStatus(selectedReservation.id, 'Completed'); setSelectedReservation(null); }}
                                                className="flex-1 bg-primary text-secondary py-5 rounded-[2rem] font-black hover:bg-yellow-500 transition-all shadow-xl shadow-primary/20"
                                            >
                                                Check-In Guest
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* Menu Add/Edit Modal */}
                {
                    isMenuModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-secondary/80 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                                <div className="bg-secondary p-8 text-white flex justify-between items-center">
                                    <h3 className="text-2xl font-black">{editingMenuId ? 'Edit Menu Item' : 'Add New Item'}</h3>
                                    <button
                                        onClick={() => setIsMenuModalOpen(false)}
                                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all font-bold"
                                    >
                                        &times;
                                    </button>
                                </div>
                                <form onSubmit={handleMenuSubmit} className="p-10 grid grid-cols-2 gap-6">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Item Name</label>
                                        <input
                                            placeholder="Salmon Fillet..."
                                            required value={menuForm.name}
                                            onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Price (Rp)</label>
                                        <input
                                            placeholder="150000"
                                            type="number" required value={menuForm.price}
                                            onChange={e => setMenuForm({ ...menuForm, price: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Image URL</label>
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Image</label>
                                        <div className="flex items-center gap-4">
                                            {menuForm.image_url ? (
                                                <div className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-100">
                                                    <img src={menuForm.image_url} className="w-full h-full object-cover" alt="Preview" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); menuImageInputRef.current?.click(); }}
                                                            className="text-white text-xs font-bold"
                                                        >
                                                            Change
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); menuImageInputRef.current?.click(); }}
                                                    className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors"
                                                >
                                                    <Plus className="text-gray-400 w-6 h-6" />
                                                </button>
                                            )}
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    ref={menuImageInputRef}
                                                    onChange={handleMenuImageUpload}
                                                    className="hidden"
                                                    accept="image/*"
                                                />
                                                <p className="text-xs text-gray-400 font-medium">
                                                    {uploadingMenuImage ? 'Uploading...' : 'Upload a high-quality food image (max 5MB)'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Description</label>
                                        <textarea
                                            placeholder="A short description of the dish..."
                                            required value={menuForm.description}
                                            onChange={e => setMenuForm({ ...menuForm, description: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold h-24"
                                        ></textarea>
                                    </div>
                                    <div className="col-span-2 pt-4">
                                        <button type="submit" className="w-full bg-primary text-secondary py-5 rounded-[2rem] font-black hover:bg-yellow-500 transition-all shadow-xl shadow-primary/20">
                                            {editingMenuId ? 'Save Changes' : 'Create Menu Item'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Menu Item Delete Confirmation Modal */}
                {
                    itemToDelete && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-secondary/90 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                                <div className="p-8 text-center">
                                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Trash2 size={40} />
                                    </div>
                                    <h3 className="text-xl font-black text-secondary mb-2">Delete Menu Item?</h3>
                                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                        You are about to delete <span className="font-bold text-secondary">"{itemToDelete.name}"</span>. This action cannot be undone.
                                    </p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setItemToDelete(null)}
                                            className="flex-1 px-6 py-4 rounded-xl bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={deleteMenuItem}
                                            className="flex-1 px-6 py-4 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Table Add/Edit Modal */}
                {
                    isTableModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-secondary/80 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                                <div className="bg-secondary p-8 text-white flex justify-between items-center">
                                    <h3 className="text-2xl font-black">{editingTableId ? 'Edit Table' : 'Add New Table'}</h3>
                                    <button
                                        onClick={() => setIsTableModalOpen(false)}
                                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all font-bold"
                                    >
                                        &times;
                                    </button>
                                </div>
                                <form onSubmit={handleTableSubmit} className="p-10 space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Table Name</label>
                                            <input
                                                placeholder="T-10"
                                                required value={tableForm.name}
                                                onChange={e => setTableForm({ ...tableForm, name: e.target.value })}
                                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                            />
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Capacity</label>
                                            <input
                                                placeholder="4"
                                                type="number" required value={tableForm.capacity}
                                                onChange={e => setTableForm({ ...tableForm, capacity: e.target.value })}
                                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                            />
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Location</label>
                                            <select
                                                value={tableForm.location}
                                                onChange={e => setTableForm({ ...tableForm, location: e.target.value })}
                                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                            >
                                                <option value="Indoor">Indoor</option>
                                                <option value="Outdoor">Outdoor</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Type</label>
                                            <select
                                                value={tableForm.type}
                                                onChange={e => setTableForm({ ...tableForm, type: e.target.value })}
                                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                            >
                                                <option value="Standard">Standard</option>
                                                <option value="Booth">Booth</option>
                                                <option value="VIP">VIP</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Status</label>
                                            <select
                                                value={tableForm.status}
                                                onChange={e => setTableForm({ ...tableForm, status: e.target.value })}
                                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                            >
                                                <option value="Available">Available</option>
                                                <option value="Blocked">Blocked</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-100 pt-6">
                                        <label className="flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={tableForm.is_joinable}
                                                onChange={e => setTableForm({ ...tableForm, is_joinable: e.target.checked })}
                                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                            />
                                            <span className="ml-3 text-sm font-bold text-gray-600">
                                                <span className="text-secondary">Joinable:</span> Can be combined with other tables for large parties
                                            </span>
                                        </label>
                                    </div>
                                    <div className="pt-4">
                                        <button type="submit" className="w-full bg-primary text-secondary py-5 rounded-[2rem] font-black hover:bg-yellow-500 transition-all shadow-xl shadow-primary/20">
                                            {editingTableId ? 'Save Changes' : 'Create Table'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Table Delete Confirmation */}
                {
                    tableToDelete && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-secondary/90 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                                <div className="p-8 text-center">
                                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Trash2 size={40} />
                                    </div>
                                    <h3 className="text-xl font-black text-secondary mb-2">Delete Table?</h3>
                                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                        You are about to delete <span className="font-bold text-secondary">"{tableToDelete.name}"</span>. This will fail if there are active bookings.
                                    </p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setTableToDelete(null)}
                                            className="flex-1 px-6 py-4 rounded-xl bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={deleteTable}
                                            className="flex-1 px-6 py-4 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Reservation Add/Edit Modal */}
                {
                    isReservationModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-secondary/80 backdrop-blur-md animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                                <div className="bg-secondary p-8 text-white flex justify-between items-center">
                                    <h3 className="text-2xl font-black">{editingReservationId ? 'Edit Reservation' : 'New Reservation'}</h3>
                                    <button
                                        onClick={() => setIsReservationModalOpen(false)}
                                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all font-bold"
                                    >
                                        &times;
                                    </button>
                                </div>
                                <form onSubmit={handleReservationSubmit} className="p-10 grid grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Customer Name</label>
                                        <input
                                            required value={reservationForm.customer_name}
                                            onChange={e => setReservationForm({ ...reservationForm, customer_name: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Phone</label>
                                        <input
                                            required value={reservationForm.customer_phone}
                                            onChange={e => setReservationForm({ ...reservationForm, customer_phone: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Email</label>
                                        <input
                                            type="email" required value={reservationForm.customer_email}
                                            onChange={e => setReservationForm({ ...reservationForm, customer_email: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Date</label>
                                        <input
                                            type="date" required value={reservationForm.date}
                                            onChange={e => setReservationForm({ ...reservationForm, date: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Time Slot</label>
                                        <select
                                            value={reservationForm.time_slot}
                                            onChange={e => setReservationForm({ ...reservationForm, time_slot: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                        >
                                            {['12:00', '13:00', '14:00', '17:00', '18:00', '19:00', '20:00', '21:00'].map(slot => (
                                                <option key={slot} value={slot}>{slot}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Guests</label>
                                        <input
                                            type="number" required value={reservationForm.guest_count}
                                            onChange={e => setReservationForm({ ...reservationForm, guest_count: parseInt(e.target.value) })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Assigned Table</label>
                                        <select
                                            value={reservationForm.table_id}
                                            onChange={e => setReservationForm({ ...reservationForm, table_id: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                        >
                                            <option value="">Select Table</option>
                                            {tables.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} (Cap: {t.capacity})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Status</label>
                                        <select
                                            value={reservationForm.status}
                                            onChange={e => setReservationForm({ ...reservationForm, status: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                                        >
                                            <option value="Pending Payment">Pending Payment</option>
                                            <option value="Confirmed">Confirmed</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 block">Special Requests</label>
                                        <textarea
                                            value={reservationForm.special_requests}
                                            onChange={e => setReservationForm({ ...reservationForm, special_requests: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold h-20"
                                        ></textarea>
                                    </div>
                                    <div className="col-span-2 pt-4">
                                        <button type="submit" className="w-full bg-primary text-secondary py-5 rounded-[2rem] font-black hover:bg-yellow-500 transition-all shadow-xl shadow-primary/20">
                                            {editingReservationId ? 'Save Changes' : 'Create Reservation'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Reservation Delete Confirmation */}
                {
                    reservationToDelete && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-secondary/90 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                                <div className="p-8 text-center">
                                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Trash2 size={40} />
                                    </div>
                                    <h3 className="text-xl font-black text-secondary mb-2">Delete Reservation?</h3>
                                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                        You are about to permanently delete the reservation for <span className="font-bold text-secondary">"{reservationToDelete.customer_name}"</span>.
                                    </p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setReservationToDelete(null)}
                                            className="flex-1 px-6 py-4 rounded-xl bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={deleteReservation}
                                            className="flex-1 px-6 py-4 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-200"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Deposit Update Confirmation */}
                {
                    depositToUpdate && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-secondary/90 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                                <div className="p-8 text-center">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${depositToUpdate.deposit_paid ? 'bg-orange-50 text-orange-500' : 'bg-green-50 text-green-500'}`}>
                                        <DollarSign size={40} />
                                    </div>
                                    <h3 className="text-xl font-black text-secondary mb-2">
                                        {depositToUpdate.deposit_paid ? 'Mark as Unpaid?' : 'Confirm Payment?'}
                                    </h3>
                                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                        Update deposit status for <span className="font-bold text-secondary">"{depositToUpdate.customer_name}"</span> to <span className={`font-bold ${depositToUpdate.deposit_paid ? 'text-orange-500' : 'text-green-500'}`}>{depositToUpdate.deposit_paid ? 'Pending' : 'Paid'}</span>?
                                    </p>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setDepositToUpdate(null)}
                                            className="flex-1 px-6 py-4 rounded-xl bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={updateDepositStatus}
                                            className={`flex-1 px-6 py-4 rounded-xl text-white font-bold transition-all shadow-lg ${depositToUpdate.deposit_paid ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-green-500 hover:bg-green-600 shadow-green-200'}`}
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </main >
        </div >
    );
}
