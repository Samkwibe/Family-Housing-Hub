// src/components/LangSwitch.jsx
import React, { useState } from 'react';
import { Globe, Check } from 'lucide-react';

export default function LangSwitch() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
  ];

  const currentLanguage = languages.find(lang => lang.code === currentLang);

  const handleLanguageChange = (langCode) => {
    setCurrentLang(langCode);
    setIsOpen(false);
    
    // In a real app, you would update i18n here
    console.log('Language changed to:', langCode);
    
    // Show confirmation toast
    const event = new CustomEvent('showToast', {
      detail: {
        message: `Language changed to ${languages.find(l => l.code === langCode)?.name}`,
        type: 'success'
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm font-medium">{currentLanguage?.code.toUpperCase()}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Select Language</p>
            </div>
            
            <div className="py-2">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-4 bg-gray-200 rounded border flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-600">
                        {language.code.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{language.name}</p>
                      <p className="text-gray-500 text-xs">{language.nativeName}</p>
                    </div>
                  </div>
                  
                  {currentLang === language.code && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
            
            <div className="px-4 py-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                More languages coming soon
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}