import './globals.css';

export const metadata = {
  title: 'Adaptive Quiz Generator',
  description: 'An AI-powered adaptive quiz generator',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
