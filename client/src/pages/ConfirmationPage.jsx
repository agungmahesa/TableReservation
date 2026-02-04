import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, QrCode, AlertCircle, ArrowRight, Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export default function ConfirmationPage() {
    const { state } = useLocation();

    if (!state) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <p className="text-lg text-gray-500">No reservation found.</p>
                <Link to="/" className="text-primary hover:underline mt-4">Return Home</Link>
            </div>
        );
    }

    const downloadQR = () => {
        const canvas = document.getElementById('qr-canvas');
        if (canvas) {
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = url;
            link.download = `Lumina-Reservation-${state.reservationId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                <div className="bg-secondary p-8 text-center text-white">
                    <div className="flex justify-center mb-4">
                        <CheckCircle className="w-16 h-16 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Reservation Received!</h1>
                    <p className="text-gray-300">
                        {state.requiresDeposit
                            ? 'Please complete your deposit to secure the table.'
                            : 'Your table has been successfully reserved.'}
                    </p>
                </div>

                <div className="p-8 md:p-12 flex flex-col md:flex-row gap-12 items-center">
                    {/* Information Section */}
                    <div className="flex-1 space-y-6 w-full">
                        <h2 className="text-xl font-bold border-b border-gray-100 pb-2">Booking Summary</h2>

                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                            <span className="text-gray-400 font-bold uppercase tracking-wider">Name</span>
                            <span className="font-bold text-secondary text-right">{state.customer_name}</span>

                            <span className="text-gray-400 font-bold uppercase tracking-wider">Date</span>
                            <span className="font-bold text-secondary text-right">{state.date}</span>

                            <span className="text-gray-400 font-bold uppercase tracking-wider">Time</span>
                            <span className="font-bold text-secondary text-right">{state.time_slot}</span>

                            <span className="text-gray-400 font-bold uppercase tracking-wider">Guests</span>
                            <span className="font-bold text-secondary text-right">{state.guest_count}</span>

                            <span className="text-gray-400 font-bold uppercase tracking-wider">ID</span>
                            <span className="font-bold text-primary text-right">#{state.reservationId}</span>
                        </div>

                        {state.requiresDeposit && (
                            <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl space-y-3">
                                <div className="flex items-center gap-2 text-amber-800 font-bold">
                                    <AlertCircle className="w-5 h-5" /> Deposit Required
                                </div>
                                <p className="text-amber-700 text-sm">
                                    Since your booking is for more than 4 guests, a deposit of
                                    <span className="font-bold ml-1">Rp {state.depositAmount.toLocaleString()}</span> is required.
                                </p>
                                <div className="bg-white p-3 rounded-xl border border-amber-100 text-center text-xs font-mono">
                                    VA: 1234 5678 9012 (Demo)
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex flex-col sm:flex-row gap-4">
                            <Link to="/" className="flex-1 text-center py-4 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 font-bold transition-all">
                                Close
                            </Link>
                            {!state.requiresDeposit && (
                                <Link to="/book" className="flex-1 text-center py-4 bg-primary text-secondary rounded-2xl font-bold hover:bg-yellow-500 transition-all flex items-center justify-center gap-2">
                                    New Booking <ArrowRight className="w-4 h-4" />
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* QR Code Section */}
                    <div className="md:w-64 flex flex-col items-center gap-4 bg-gray-50 p-8 rounded-3xl border-2 border-dashed border-gray-200">
                        <div className="bg-white p-4 rounded-2xl shadow-sm">
                            <QRCodeCanvas
                                id="qr-canvas"
                                value={`LUMINA-${state.reservationId}`}
                                size={160}
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                        <div className="text-center space-y-3">
                            <div>
                                <div className="flex items-center justify-center gap-2 text-primary font-bold mb-1">
                                    <QrCode className="w-4 h-4" /> Entry Token
                                </div>
                                <p className="text-[10px] text-gray-400 leading-tight">
                                    Scan this QR at the restaurant <br /> to check-in your arrival.
                                </p>
                            </div>
                            <button
                                onClick={downloadQR}
                                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-secondary text-[10px] font-bold py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                            >
                                <Download className="w-3 h-3" /> Download Ticket
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
