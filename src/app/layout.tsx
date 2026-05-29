import './globals.css';
import SessionWrapper from '@/components/SessionWrapper';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        {/* Load Material Symbols Rounded for tactical UI icons */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=assignment,delete,destruction"
        />
      </head>
      {/* CRITICAL: Do not use inter.className here. 
          The 'antialiased' class allows the custom font-family 
          defined in globals.css to take priority.
      */}
      <body className="antialiased">
        <SessionWrapper>
          <div 
            className="relative min-h-screen w-full overflow-x-hidden"
            style={{ 
              backgroundImage: `url('/mesh-719.jpg')`, 
              backgroundSize: 'cover',
              backgroundPosition: 'center' 
            }}
          >
            {/* Dark overlay to ensure tactical text legibility */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </SessionWrapper>
      </body>
    </html>
  );
}
