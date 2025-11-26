// src/contexts/LanguageContext.jsx - Multi-language Support
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Translations dictionary
const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    rent: 'Rent',
    budget: 'Budget',
    maintenance: 'Maintenance',
    calendar: 'Calendar',
    shopping: 'Shopping & Meals',
    documents: 'Documents',
    messages: 'Messages',
    children: 'Children',
    health: 'Health',
    safety: 'Safety',
    assistant: 'AI Assistant',
    resources: 'Resources',
    landlord: 'Landlord',
    profile: 'Profile',
    settings: 'Settings',
    help: 'Help & Support',
    logout: 'Sign Out',

    // Common
    welcome: 'Welcome',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    loading: 'Loading...',
    submit: 'Submit',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    yes: 'Yes',
    no: 'No',
    
    // Dashboard
    welcomeBack: 'Welcome back',
    totalPaid: 'Total Paid',
    pendingRequests: 'Pending Requests',
    unreadMessages: 'Unread Messages',
    documentsExpiring: 'Documents Expiring',
    recentActivity: 'Recent Activity',
    quickActions: 'Quick Actions',
    payRent: 'Pay Rent',
    newRequest: 'New Request',
    viewDocuments: 'View Documents',
    
    // Rent
    rentPayment: 'Rent Payment',
    monthlyRent: 'Monthly Rent',
    dueDate: 'Due Date',
    paymentHistory: 'Payment History',
    makePayment: 'Make Payment',
    paid: 'Paid',
    pending: 'Pending',
    overdue: 'Overdue',

    // Maintenance
    maintenanceRequest: 'Maintenance Request',
    createRequest: 'Create Request',
    requestTitle: 'Request Title',
    description: 'Description',
    priority: 'Priority',
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    status: 'Status',
    submitted: 'Submitted',
    inProgress: 'In Progress',
    completed: 'Completed',

    // Resources
    communityResources: 'Community Resources',
    findResources: 'Find resources near you',
    foodAssistance: 'Food Assistance',
    healthcare: 'Healthcare',
    housingHelp: 'Housing Help',
    financialAid: 'Financial Aid',
    legalAid: 'Legal Aid',
    emergencyContacts: 'Emergency Contacts',
    nearYou: 'Near You',
    callNow: 'Call Now',
    visitWebsite: 'Visit Website',
    getDirections: 'Get Directions',

    // Profile
    personalInfo: 'Personal Information',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    city: 'City',
    state: 'State',
    zipCode: 'ZIP Code',
    familyMembers: 'Family Members',
    
    // Notifications
    notifications: 'Notifications',
    noNotifications: 'No notifications',
    markAllRead: 'Mark all as read',
    
    // Errors
    errorOccurred: 'An error occurred',
    tryAgain: 'Please try again',
    
    // Success messages
    savedSuccessfully: 'Saved successfully',
    deletedSuccessfully: 'Deleted successfully'
  },

  es: {
    // Navigation
    dashboard: 'Panel',
    rent: 'Alquiler',
    budget: 'Presupuesto',
    maintenance: 'Mantenimiento',
    calendar: 'Calendario',
    shopping: 'Compras y Comidas',
    documents: 'Documentos',
    messages: 'Mensajes',
    children: 'Niños',
    health: 'Salud',
    safety: 'Seguridad',
    assistant: 'Asistente IA',
    resources: 'Recursos',
    landlord: 'Propietario',
    profile: 'Perfil',
    settings: 'Configuración',
    help: 'Ayuda y Soporte',
    logout: 'Cerrar Sesión',

    // Common
    welcome: 'Bienvenido',
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Agregar',
    search: 'Buscar',
    filter: 'Filtrar',
    loading: 'Cargando...',
    submit: 'Enviar',
    close: 'Cerrar',
    back: 'Atrás',
    next: 'Siguiente',
    yes: 'Sí',
    no: 'No',
    
    // Dashboard
    welcomeBack: 'Bienvenido de nuevo',
    totalPaid: 'Total Pagado',
    pendingRequests: 'Solicitudes Pendientes',
    unreadMessages: 'Mensajes No Leídos',
    documentsExpiring: 'Documentos por Vencer',
    recentActivity: 'Actividad Reciente',
    quickActions: 'Acciones Rápidas',
    payRent: 'Pagar Alquiler',
    newRequest: 'Nueva Solicitud',
    viewDocuments: 'Ver Documentos',
    
    // Rent
    rentPayment: 'Pago de Alquiler',
    monthlyRent: 'Alquiler Mensual',
    dueDate: 'Fecha de Vencimiento',
    paymentHistory: 'Historial de Pagos',
    makePayment: 'Hacer Pago',
    paid: 'Pagado',
    pending: 'Pendiente',
    overdue: 'Vencido',

    // Maintenance
    maintenanceRequest: 'Solicitud de Mantenimiento',
    createRequest: 'Crear Solicitud',
    requestTitle: 'Título de Solicitud',
    description: 'Descripción',
    priority: 'Prioridad',
    urgent: 'Urgente',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
    status: 'Estado',
    submitted: 'Enviado',
    inProgress: 'En Progreso',
    completed: 'Completado',

    // Resources
    communityResources: 'Recursos Comunitarios',
    findResources: 'Encuentra recursos cerca de ti',
    foodAssistance: 'Asistencia Alimentaria',
    healthcare: 'Atención Médica',
    housingHelp: 'Ayuda de Vivienda',
    financialAid: 'Ayuda Financiera',
    legalAid: 'Ayuda Legal',
    emergencyContacts: 'Contactos de Emergencia',
    nearYou: 'Cerca de Ti',
    callNow: 'Llamar Ahora',
    visitWebsite: 'Visitar Sitio Web',
    getDirections: 'Obtener Direcciones',

    // Profile
    personalInfo: 'Información Personal',
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'Correo Electrónico',
    phone: 'Teléfono',
    address: 'Dirección',
    city: 'Ciudad',
    state: 'Estado',
    zipCode: 'Código Postal',
    familyMembers: 'Miembros de la Familia',
    
    // Notifications
    notifications: 'Notificaciones',
    noNotifications: 'Sin notificaciones',
    markAllRead: 'Marcar todo como leído',
    
    // Errors
    errorOccurred: 'Ocurrió un error',
    tryAgain: 'Por favor intente de nuevo',
    
    // Success messages
    savedSuccessfully: 'Guardado exitosamente',
    deletedSuccessfully: 'Eliminado exitosamente'
  },

  fr: {
    // Navigation
    dashboard: 'Tableau de Bord',
    rent: 'Loyer',
    budget: 'Budget',
    maintenance: 'Maintenance',
    calendar: 'Calendrier',
    shopping: 'Courses et Repas',
    documents: 'Documents',
    messages: 'Messages',
    children: 'Enfants',
    health: 'Santé',
    safety: 'Sécurité',
    assistant: 'Assistant IA',
    resources: 'Ressources',
    landlord: 'Propriétaire',
    profile: 'Profil',
    settings: 'Paramètres',
    help: 'Aide et Support',
    logout: 'Déconnexion',

    // Common
    welcome: 'Bienvenue',
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    add: 'Ajouter',
    search: 'Rechercher',
    filter: 'Filtrer',
    loading: 'Chargement...',
    submit: 'Soumettre',
    close: 'Fermer',
    back: 'Retour',
    next: 'Suivant',
    yes: 'Oui',
    no: 'Non',
    
    // Dashboard
    welcomeBack: 'Bon retour',
    totalPaid: 'Total Payé',
    pendingRequests: 'Demandes en Attente',
    unreadMessages: 'Messages Non Lus',
    documentsExpiring: 'Documents Expirant',
    recentActivity: 'Activité Récente',
    quickActions: 'Actions Rapides',
    payRent: 'Payer le Loyer',
    newRequest: 'Nouvelle Demande',
    viewDocuments: 'Voir Documents',
    
    // Resources
    communityResources: 'Ressources Communautaires',
    findResources: 'Trouvez des ressources près de vous',
    foodAssistance: 'Aide Alimentaire',
    healthcare: 'Soins de Santé',
    housingHelp: 'Aide au Logement',
    financialAid: 'Aide Financière',
    legalAid: 'Aide Juridique',
    emergencyContacts: 'Contacts d\'Urgence',
    nearYou: 'Près de Vous',
    callNow: 'Appeler',
    visitWebsite: 'Visiter le Site',
    getDirections: 'Obtenir Itinéraire',

    // Notifications
    notifications: 'Notifications',
    noNotifications: 'Pas de notifications',
    markAllRead: 'Tout marquer comme lu',
    
    // Profile
    personalInfo: 'Informations Personnelles',
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    address: 'Adresse',
    city: 'Ville',
    state: 'État',
    zipCode: 'Code Postal',
    familyMembers: 'Membres de la Famille'
  },

  sw: {
    // Navigation (Swahili)
    dashboard: 'Dashibodi',
    rent: 'Kodi',
    budget: 'Bajeti',
    maintenance: 'Matengenezo',
    calendar: 'Kalenda',
    shopping: 'Ununuzi na Milo',
    documents: 'Nyaraka',
    messages: 'Ujumbe',
    children: 'Watoto',
    health: 'Afya',
    safety: 'Usalama',
    assistant: 'Msaidizi wa AI',
    resources: 'Rasilimali',
    landlord: 'Mwenye Nyumba',
    profile: 'Wasifu',
    settings: 'Mipangilio',
    help: 'Msaada',
    logout: 'Ondoka',

    // Common
    welcome: 'Karibu',
    save: 'Hifadhi',
    cancel: 'Ghairi',
    delete: 'Futa',
    edit: 'Hariri',
    add: 'Ongeza',
    search: 'Tafuta',
    loading: 'Inapakia...',
    
    // Resources
    communityResources: 'Rasilimali za Jamii',
    findResources: 'Pata rasilimali karibu nawe',
    nearYou: 'Karibu Nawe',
    callNow: 'Piga Simu',
    
    // Notifications
    notifications: 'Arifa',
    noNotifications: 'Hakuna arifa'
  },

  ar: {
    // Navigation (Arabic)
    dashboard: 'لوحة التحكم',
    rent: 'الإيجار',
    budget: 'الميزانية',
    maintenance: 'الصيانة',
    calendar: 'التقويم',
    shopping: 'التسوق والوجبات',
    documents: 'المستندات',
    messages: 'الرسائل',
    children: 'الأطفال',
    health: 'الصحة',
    safety: 'السلامة',
    assistant: 'المساعد الذكي',
    resources: 'الموارد',
    landlord: 'المالك',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    help: 'المساعدة',
    logout: 'تسجيل الخروج',

    // Common
    welcome: 'مرحباً',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    search: 'بحث',
    loading: 'جاري التحميل...',
    
    // Resources
    communityResources: 'موارد المجتمع',
    findResources: 'ابحث عن الموارد بالقرب منك',
    nearYou: 'بالقرب منك',
    callNow: 'اتصل الآن',
    
    // Notifications
    notifications: 'الإشعارات',
    noNotifications: 'لا توجد إشعارات'
  }
};

// Available languages
const languages = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' }
];

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const { userProfile, updateUserProfile } = useAuth();

  // Load language from user preferences or localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang && translations[savedLang]) {
      setCurrentLanguage(savedLang);
    } else if (userProfile?.preferences?.language) {
      setCurrentLanguage(userProfile.preferences.language);
    }
  }, [userProfile]);

  // Update document direction for RTL languages
  useEffect(() => {
    const lang = languages.find(l => l.code === currentLanguage);
    document.documentElement.dir = lang?.dir || 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  // Change language
  const changeLanguage = useCallback(async (langCode) => {
    if (!translations[langCode]) return;

    setCurrentLanguage(langCode);
    localStorage.setItem('preferredLanguage', langCode);

    // Update user preferences if logged in
    if (userProfile && updateUserProfile) {
      try {
        await updateUserProfile({
          preferences: {
            ...userProfile.preferences,
            language: langCode
          }
        });
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  }, [userProfile, updateUserProfile]);

  // Translation function
  const t = useCallback((key) => {
    return translations[currentLanguage]?.[key] || translations.en[key] || key;
  }, [currentLanguage]);

  // Get current language info
  const getCurrentLanguageInfo = useCallback(() => {
    return languages.find(l => l.code === currentLanguage) || languages[0];
  }, [currentLanguage]);

  const value = {
    currentLanguage,
    languages,
    changeLanguage,
    t,
    getCurrentLanguageInfo,
    isRTL: getCurrentLanguageInfo().dir === 'rtl'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

