import './globals.css';
import Navigation from './components/Navigation';

export const metadata = {
  title: 'Mantip ERP - Accounting & Business Management',
  description: 'Business System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>
        <Navigation>
          {children}
        </Navigation>
      </body>
    </html>
  );
}
