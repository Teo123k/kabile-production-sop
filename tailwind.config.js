/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                app: {
                    bg: '#121212',
                    surface: '#1E1E1E',
                    border: '#333333',
                    text: '#F5F5F5',
                    muted: '#A0A0A0',
                    accent: '#D4AF37', // Muted gold for culinary focus
                    accentHover: '#B5952F',
                    danger: '#DC2626',
                    success: '#16A34A',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
