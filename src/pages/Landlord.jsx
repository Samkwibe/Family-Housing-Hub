// src/pages/Landlord.jsx
import React from 'react'
import { Building, Phone, Mail, MapPin } from 'lucide-react'

export default function Landlord() {
  const contactInfo = {
    name: 'ABC Property Management',
    phone: '+1 (555) 123-4567',
    email: 'contact@abcproperties.com',
    address: '123 Main Street, Suite 100, City, State 12345',
    officeHours: 'Monday - Friday: 9:00 AM - 5:00 PM\nEmergency: 24/7'
  }

  const emergencyContacts = [
    { name: 'Police/Fire/Medical', number: '911' },
    { name: 'After Hours Emergency', number: '+1 (555) 987-6543' },
    { name: 'Maintenance Hotline', number: '+1 (555) 456-7890' }
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Landlord & Contact</h1>
        <p className="text-gray-600">Get in touch with your property management</p>
      </div>

      {/* Contact Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{contactInfo.name}</h2>
              <p className="text-gray-600">Your Property Management</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{contactInfo.phone}</p>
                <p className="text-sm text-gray-600">Office Phone</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{contactInfo.email}</p>
                <p className="text-sm text-gray-600">Email Address</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Office Address</p>
                <p className="text-sm text-gray-600">{contactInfo.address}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 whitespace-pre-line">{contactInfo.officeHours}</p>
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Emergency Contacts</h2>
          <div className="space-y-4">
            {emergencyContacts.map((contact, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">{contact.name}</p>
                  <p className="text-gray-600">{contact.number}</p>
                </div>
                <a
                  href={`tel:${contact.number}`}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Call
                </a>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>For emergencies only:</strong> Fire, flood, gas leak, no heat in winter, broken locks, or other urgent safety issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}