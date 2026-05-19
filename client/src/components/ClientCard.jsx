import { memo } from 'react'
import { motion } from 'framer-motion'
import { Phone, Mail, Globe, Instagram, MapPin } from 'lucide-react'
import { daysBetween, getDaysElapsed } from '../utils/dateHelpers'

function ClientCard({ client }) {
  if (!client) return null

  const totalDays = daysBetween(client.contract_start, client.contract_end)
  const elapsed = getDaysElapsed(client.contract_start, client.contract_end)
  const remaining = totalDays - elapsed
  const progress = totalDays > 0 ? (elapsed / totalDays) * 100 : 0

  const statusColor = remaining > 30 ? 'text-apple-green' : remaining > 10 ? 'text-apple-amber' : 'text-apple-red'
  const isCDZ = client.name?.includes('CDZ') || client.name?.includes('Zahir')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card hover:shadow-apple-hover transition-shadow duration-200 overflow-hidden"
    >
      {/* Brand Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isCDZ && (
            <img src="/images/cdz/logo.png" alt="CDZ"
              className="h-12 w-12 object-contain rounded-lg bg-apple-surface p-1.5"
              onError={e => e.target.style.display='none'} />
          )}
          <div className="min-w-0">
            <h3 className="text-subheading font-semibold truncate text-apple-text">{client.name}</h3>
            <p className="text-small text-apple-muted">{client.contact_name}</p>
          </div>
        </div>
        <span className={`text-small font-medium whitespace-nowrap ${statusColor}`}>{remaining} days left</span>
      </div>

      {/* Dr. Zahir Photo Row */}
      {isCDZ && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-apple-surface rounded-lg">
          <img src="/images/cdz/doctor.jpg" alt="Dr. Zahir"
            className="w-14 h-14 rounded-full object-cover ring-2 ring-apple-blue/20 flex-shrink-0"
            onError={e => e.target.style.display='none'} />
          <div>
            <p className="text-body font-medium text-apple-text">Dr. Mohamed Amine Zahir</p>
            <p className="text-small text-apple-muted">Chirurgien-Dentiste · CDZ Founder</p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-small text-apple-muted mb-1">
          <span>Contract progress</span>
          <span>Month {Math.ceil(elapsed / 30)} / {Math.ceil(totalDays / 30)}</span>
        </div>
        <div className="h-2 bg-apple-surface rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-apple-blue rounded-full"
          />
        </div>
        <div className="flex justify-between text-micro text-apple-tertiary mt-1">
          <span>{client.contract_start}</span>
          <span>{client.contract_end}</span>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-2 gap-2 text-small text-apple-muted mb-4">
        {client.phone1 && (
          <a href={`tel:${client.phone1}`} className="flex items-center gap-1.5 hover:text-apple-blue transition-colors">
            <Phone size={12} /> {client.phone1}
          </a>
        )}
        {client.email && (
          <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 hover:text-apple-blue transition-colors truncate">
            <Mail size={12} /> Email
          </a>
        )}
        {client.website && (
          <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-apple-blue transition-colors">
            <Globe size={12} /> Website
          </a>
        )}
        {client.instagram && (
          <a href={`https://instagram.com/${client.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-apple-blue transition-colors">
            <Instagram size={12} /> Instagram
          </a>
        )}
      </div>

      {/* Address */}
      <div className="flex items-start gap-1 text-small text-apple-muted">
        <MapPin size={12} className="mt-0.5 flex-shrink-0" />
        <span className="text-micro">{client.address}</span>
      </div>
    </motion.div>
  )
}

export default memo(ClientCard)
