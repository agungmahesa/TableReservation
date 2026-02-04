import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MapPin } from 'lucide-react';

export default function HomePage() {
    const [settings, setSettings] = useState({});
    const [menu, setMenu] = useState([]);
    const [loading, setLoading] = useState(true);

    const containerRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!containerRef.current) return;

            const container = containerRef.current;
            const windowHeight = window.innerHeight;
            const currentScroll = container.scrollTop;
            // Calculate current section index
            const currentIndex = Math.round(currentScroll / windowHeight);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                container.scrollTo({
                    top: (currentIndex + 1) * windowHeight,
                    behavior: 'smooth'
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                container.scrollTo({
                    top: Math.max(0, (currentIndex - 1) * windowHeight),
                    behavior: 'smooth'
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [settingsRes, menuRes] = await Promise.all([
                    axios.get('http://localhost:3000/api/settings'),
                    axios.get('http://localhost:3000/api/menu')
                ]);
                setSettings({ ...settingsRes.data, activeMenuId: menuRes.data[0]?.id });
                setMenu(menuRes.data);
            } catch (err) {
                console.error('Failed to fetch homepage data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="flex flex-col w-full bg-background text-surface font-sans h-screen overflow-y-scroll overflow-x-hidden snap-y snap-mandatory scroll-smooth"
        >
            {/* 1. Hero Section */}
            <section className="relative h-screen flex items-center justify-center text-center px-4 overflow-hidden snap-start shrink-0">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105"
                    style={{ backgroundImage: `url(${settings.hero_image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop'})` }}
                >
                    <div className="absolute inset-0 bg-black/50"></div>
                </div>
                <div className="relative z-10 max-w-4xl space-y-6">
                    <h2 className="text-[#E0E0E0] text-lg md:text-xl uppercase tracking-[0.3em] font-medium animate-fade-in-up">
                        {settings.hero_subtitle || 'Welcome to Nebular Solstice'}
                    </h2>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-[#E0E0E0] tracking-tight leading-tight">
                        {settings.hero_title || 'Taste the'}<br />
                        <span className="text-primary italic">{settings.hero_highlight || 'Extraordinary'}</span>
                    </h1>
                    <Link
                        to="/book"
                        className="inline-block mt-8 border border-primary text-primary hover:bg-primary hover:text-black px-10 py-4 rounded-full font-serif font-bold text-sm tracking-widest uppercase transition-all duration-500 hover:scale-105 backdrop-blur-sm"
                    >
                        Reserve Your Table
                    </Link>
                </div>
            </section>

            {/* 2. About Section (New) */}
            <section className="h-screen flex items-center justify-center px-6 md:px-12 bg-black text-surface relative snap-start shrink-0">
                <div className={`max-w-7xl mx-auto ${settings.about_image ? 'grid md:grid-cols-2 gap-16 text-left' : 'flex flex-col text-center max-w-3xl'} items-center transition-all duration-500`}>
                    <div className={`space-y-8 ${settings.about_image ? 'order-2 md:order-1' : ''}`}>
                        <h2 className="text-4xl md:text-5xl font-serif text-primary">
                            {settings.about_title || 'Where Flavor Meets Elegance'}
                        </h2>
                        <p className="text-[#E0E0E0] text-lg leading-relaxed font-light">
                            {settings.about_content || 'Nestled in the heart of the city, we bring you a culinary experience that transcends the ordinary. Our chefs meticulously craft each dish to tell a story of tradition and innovation.'}
                        </p>
                        <div className={`w-24 h-1 bg-primary/20 ${settings.about_image ? '' : 'mx-auto'}`}></div>
                    </div>
                    {settings.about_image && (
                        <div className="relative order-1 md:order-2 group w-full">
                            <div className="aspect-[3/4] rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700">
                                <img
                                    src={settings.about_image}
                                    alt="About Us"
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 sepia-[.25]"
                                />
                            </div>
                            <div className="absolute -bottom-8 -left-8 w-48 h-48 border border-primary/20 rounded-full hidden md:block animate-spin-slow"></div>
                        </div>
                    )}
                </div>
            </section>

            {/* 3. Menu Section */}
            <section className="h-screen flex items-center justify-center px-4 md:px-12 bg-[#0a0a0a] text-[#F3E5D0] snap-start shrink-0">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20 space-y-4">
                        <span className="text-primary uppercase tracking-[0.2em] text-sm font-bold">Discover Our Menu</span>
                        <h2 className="text-4xl md:text-5xl font-serif text-white">Culinary Masterpieces</h2>
                    </div>

                    <div className="grid md:grid-cols-12 gap-8 md:gap-16 items-start relative">
                        {/* Right: Dynamic Image (Mobile: Top, Desktop: Right) */}
                        <div className="col-span-12 md:col-span-7 sticky top-24 order-first md:order-last mb-8 md:mb-0 z-10">
                            <div className="aspect-video md:aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl relative bg-black/20">
                                {menu.map((item) => (
                                    <img
                                        key={item.id}
                                        src={item.image_url}
                                        alt={item.name}
                                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out transform scale-105 sepia-[.20] ${settings.activeMenuId === item.id ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                ))}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                            </div>
                        </div>

                        {/* Left: Menu List */}
                        <div className="col-span-12 md:col-span-5 space-y-2 max-h-[60vh] md:max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar order-last md:order-first">
                            {menu.map((item) => (
                                <div
                                    key={item.id}
                                    onMouseEnter={() => setSettings(prev => ({ ...prev, activeMenuId: item.id }))}
                                    onClick={() => setSettings(prev => ({ ...prev, activeMenuId: item.id }))}
                                    className={`group cursor-pointer transition-all duration-300 border-b border-white/5 pb-6 pt-4 ${settings.activeMenuId === item.id ? 'opacity-100 pl-4 border-l-2 border-l-primary border-b-transparent' : 'opacity-50 hover:opacity-80'}`}
                                >
                                    <div className="flex justify-between items-baseline mb-2">
                                        <h3 className={`text-xl md:text-2xl font-serif font-bold ${settings.activeMenuId === item.id ? 'text-primary' : 'text-[#E0E0E0]'}`}>
                                            {item.name}
                                        </h3>
                                        <span className="text-lg font-medium text-primary/80 font-mono">
                                            $ {item.price.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${settings.activeMenuId === item.id ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                                        <p className="text-[#E0E0E0]/70 leading-relaxed text-sm font-light">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. Location & Footer Section */}
            <footer className="h-screen flex items-center justify-center px-6 md:px-12 bg-[#1A1A1A] text-surface border-t border-white/5 text-center snap-start shrink-0">
                <div className="max-w-4xl mx-auto space-y-10">
                    <div className="space-y-6">
                        <span className="text-primary uppercase tracking-[0.2em] text-sm font-bold flex items-center justify-center gap-2">
                            <MapPin size={16} /> Visit Us
                        </span>
                        <h2 className="text-4xl md:text-5xl font-serif text-white">Find Your Way</h2>
                        <p className="text-gray-400 text-lg leading-relaxed font-light whitespace-pre-line">
                            {settings.location_address || '123 Culinary Avenue\nFood District, FD 90210'}
                        </p>
                    </div>

                    <div>
                        <a
                            href={settings.location_map_url || "https://maps.google.com"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block border border-primary text-primary px-10 py-4 rounded-full hover:bg-primary hover:text-black transition-all font-serif font-bold uppercase tracking-widest text-sm transform hover:scale-105 backdrop-blur-sm"
                        >
                            Get Directions on Google Maps
                        </a>
                    </div>

                    <div className="pt-16 border-t border-white/5 text-gray-500 text-xs tracking-widest uppercase">
                        &copy; {new Date().getFullYear()} Nebular Solstice. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
