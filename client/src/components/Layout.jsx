import { Link, Outlet, useLocation } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';

export default function Layout() {
    const location = useLocation();
    const isHome = location.pathname === '/';

    return (
        <div className={`font-sans flex flex-col ${isHome ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
            <header className={`
                py-4 px-6 md:px-12 flex justify-between items-center transition-all duration-300 z-50
                ${isHome
                    ? 'absolute top-0 w-full bg-transparent text-white/90 border-b border-white/10'
                    : 'bg-secondary text-surface shadow-md relative'
                }
            `}>
                <Link to="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight hover:text-primary transition-colors">
                    <UtensilsCrossed className="w-8 h-8 text-primary" />
                    <span>Lumina Dining</span>
                </Link>
                <nav className="flex gap-6 items-center">
                    <Link to="/" className="text-sm font-medium hover:text-primary transition-colors hidden md:block">HOME</Link>
                    <Link to="/book" className="bg-primary text-secondary px-5 py-2 rounded-full text-sm font-bold hover:bg-yellow-500 transition-transform transform active:scale-95">
                        BOOK A TABLE
                    </Link>
                </nav>
            </header>

            <main className={`flex-grow bg-background ${isHome ? 'h-full' : ''}`}>
                <Outlet />
            </main>

            {!isHome && (
                <footer className="bg-secondary text-surface/60 py-8 text-center text-sm">
                    <p>&copy; {new Date().getFullYear()} Lumina Dining. All rights reserved.</p>
                    <div className="mt-2 flex justify-center gap-4">
                        <Link to="/admin" className="hover:text-primary">Staff Login</Link>
                    </div>
                </footer>
            )}
        </div>
    );
}
