import React from 'react';
import { MessageCircle } from 'lucide-react';

export default function WhatsAppButton({ className = '' }) {
  const whatsappUrl = 'https://wa.me/message/7WVKSVB3RHOUA1';

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 ${className}`}
      aria-label="Contacter sur WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-white" />
    </a>
  );
}