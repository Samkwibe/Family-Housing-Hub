// src/components/LangSwitch.jsx - Language Switcher Component
import React, { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';

export default function LangSwitch() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentLanguage, languages, changeLanguage, t } = useLanguage();

  const currentLangInfo = languages.find(lang => lang.code === currentLanguage);

  const handleLanguageChange = async (langCode) => {
    await changeLanguage(langCode);
    setIsOpen(false);
    
    const langName = languages.find(l => l.code === langCode)?.name;
    toast.success(`Language changed to ${langName}`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Globe className="h-4 w-4" />
        <span className="text-sm font-medium">{currentLangInfo?.code.toUpperCase()}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Select Language</p>
              <p className="text-xs text-gray-500">Choose your preferred language</p>
            </div>
            
            <div className="py-2 max-h-64 overflow-y-auto">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`flex items-center justify-between w-full px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${
                    currentLanguage === language.code ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-6 rounded flex items-center justify-center text-xs font-bold ${
                      currentLanguage === language.code 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {language.code.toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className={`font-medium ${currentLanguage === language.code ? 'text-blue-700' : 'text-gray-900'}`}>
                        {language.name}
                      </p>
                      <p className="text-gray-500 text-xs">{language.nativeName}</p>
                    </div>
                  </div>
                  
                  {currentLanguage === language.code && (
                    <Check className="h-5 w-5 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
            
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                🌍 More languages coming soon
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
