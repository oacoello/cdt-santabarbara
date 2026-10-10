import './globals.css';
import SessionWrapper from '@/components/SessionWrapper';
import ScaleWrapper from '@/components/ScaleWrapper';

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
      <body className="antialiased m-0 p-0 overflow-hidden h-screen w-screen">
        <SessionWrapper>
          <ScaleWrapper>
            <div 
              className="relative h-full w-full overflow-hidden"
              style={{ 
                backgroundImage: `url('/Splash_screen_cdt.png')`, 
                backgroundSize: 'cover',
                backgroundPosition: 'center' 
              }}
            >
              {/* Dark overlay to ensure tactical text legibility */}
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />
              
              <div className="relative z-10 h-full w-full">
                {children}
              </div>
            </div>
          </ScaleWrapper>
        </SessionWrapper>
      </body>
    </html>
  );
}
