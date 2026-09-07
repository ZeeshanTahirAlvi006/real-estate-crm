import { connectDB, disconnectDB } from '../config/db.js'
import { Brokerage } from '../models/Brokerage.js'
import { User } from '../models/User.js'
import { Contact } from '../models/Contact.js'
import { Activity } from '../models/Activity.js'
import { Conversation } from '../models/Conversation.js'
import { Message } from '../models/Message.js'
import { Property } from '../models/Property.js'
import { CmaReport } from '../models/CmaReport.js'
import { FeatureFlag, initializeDefaultFeatureFlags } from '../models/FeatureFlag.js'
import { AuditLog } from '../models/AuditLog.js'
import { USER_ROLES } from '../utils/constants.js'
import { logger } from '../utils/logger.js'

const DEMO_PASSWORD = 'Password!123'

export const seedDatabase = async (): Promise<void> => {
  try {
    logger.info('Connecting to MongoDB for database seeding...')
    await connectDB()

    logger.info('Clearing existing collections...')
    await Promise.all([
      Brokerage.deleteMany({}),
      User.deleteMany({}),
      Contact.deleteMany({}),
      Activity.deleteMany({}),
      Conversation.deleteMany({}),
      Message.deleteMany({}),
      Property.deleteMany({}),
      CmaReport.deleteMany({}),
      FeatureFlag.deleteMany({}),
      AuditLog.deleteMany({}),
    ])

    // 1. Initialize Feature Flags
    logger.info('Seeding default Feature Flags...')
    await initializeDefaultFeatureFlags()

    // 2. Seed Brokerages
    logger.info('Seeding Brokerages...')
    const alMirajBrokerage = await Brokerage.create({
      name: 'Al-Miraj Real Estate & Builders',
      subdomain: 'almiraj',
      plan: 'enterprise',
      timezone: 'Asia/Karachi',
      logoUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=200&auto=format&fit=crop&q=60',
    })

    const zameenPremierBrokerage = await Brokerage.create({
      name: 'Zameen Premier Realty',
      subdomain: 'zameenpremier',
      plan: 'pro',
      timezone: 'Asia/Karachi',
      logoUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=200&auto=format&fit=crop&q=60',
    })

    // 3. Seed Users with Pakistani Names
    logger.info('Seeding User Accounts...')
    const superAdmin = await User.create({
      firstName: 'Zeeshan',
      lastName: 'Tahir Alvi',
      email: 'superadmin@proppulse.com',
      password: DEMO_PASSWORD,
      role: USER_ROLES.SUPER_ADMIN,
      brokerageId: alMirajBrokerage._id,
      phone: '+92 300 8472910',
      timezone: 'Asia/Karachi',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    })

    const brokerageOwner = await User.create({
      firstName: 'Tariq',
      lastName: 'Mahmood Khan',
      email: 'owner@almiraj.com',
      password: DEMO_PASSWORD,
      role: USER_ROLES.BROKERAGE_OWNER,
      brokerageId: alMirajBrokerage._id,
      phone: '+92 321 9845120',
      timezone: 'Asia/Karachi',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    })
    alMirajBrokerage.createdBy = brokerageOwner._id
    await alMirajBrokerage.save()

    await User.create({
      firstName: 'Ayesha',
      lastName: 'Siddiqua',
      email: 'ayesha.lead@almiraj.com',
      password: DEMO_PASSWORD,
      role: USER_ROLES.LEAD,
      brokerageId: alMirajBrokerage._id,
      phone: '+92 333 4519283',
      timezone: 'Asia/Karachi',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    })

    const agentHamza = await User.create({
      firstName: 'Hamza',
      lastName: 'Farooq',
      email: 'hamza@almiraj.com',
      password: DEMO_PASSWORD,
      role: USER_ROLES.AGENT,
      brokerageId: alMirajBrokerage._id,
      phone: '+92 301 6723901',
      timezone: 'Asia/Karachi',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    })

    const agentFatima = await User.create({
      firstName: 'Fatima',
      lastName: 'Noor',
      email: 'fatima@almiraj.com',
      password: DEMO_PASSWORD,
      role: USER_ROLES.AGENT,
      brokerageId: alMirajBrokerage._id,
      phone: '+92 345 8920194',
      timezone: 'Asia/Karachi',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    })

    const agentBilal = await User.create({
      firstName: 'Bilal',
      lastName: 'Ahmed Qureshi',
      email: 'bilal@almiraj.com',
      password: DEMO_PASSWORD,
      role: USER_ROLES.AGENT,
      brokerageId: alMirajBrokerage._id,
      phone: '+92 302 7819023',
      timezone: 'Asia/Karachi',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    })

    const agentZainab = await User.create({
      firstName: 'Zainab',
      lastName: 'Malik',
      email: 'zainab@almiraj.com',
      password: DEMO_PASSWORD,
      role: USER_ROLES.AGENT,
      brokerageId: alMirajBrokerage._id,
      phone: '+92 334 5612890',
      timezone: 'Asia/Karachi',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    })

    const clientKamran = await User.create({
      firstName: 'Kamran',
      lastName: 'Akram',
      email: 'kamran.akram@gmail.com',
      password: DEMO_PASSWORD,
      role: USER_ROLES.LEAD,
      brokerageId: alMirajBrokerage._id,
      phone: '+92 322 4109823',
      timezone: 'Asia/Karachi',
    })

    const agentsList = [agentHamza, agentFatima, agentBilal, agentZainab]

    // 4. Seed Contacts with Pakistani Names, Pakistani Locations & Interests
    logger.info('Seeding 25+ Pakistani Real Estate Contacts...')
    const contactsData = [
      {
        firstName: 'Ayesha',
        lastName: 'Siddiqua',
        email: 'ayesha.lead@almiraj.com',
        phone: '+92 333 4519283',
        address: 'Villa 12, Street 4, Sector G, Phase 5, DHA',
        city: 'Lahore',
        state: 'Punjab',
        zipCode: '54792',
        leadSource: 'Client VIP Portal',
        leadScore: 96,
        tags: ['VIP Client', 'Under Contract', 'DHA Phase 6', 'Pre-Approved'],
        status: 'active',
        propertyInterests: ['742 Evergreen Terrace (Under Contract)', '104 Barton Creek Luxury Villa'],
        notes: 'VIP Client currently under escrow contract for 742 Evergreen Terrace. Assigned to Hamza Farooq.',
      },
      {
        firstName: 'Kamran',
        lastName: 'Akram',
        email: 'kamran.akram@gmail.com',
        phone: '+92 322 4109823',
        address: 'House 88, Street 7, Phase 4, Bahria Town',
        city: 'Rawalpindi',
        state: 'Punjab',
        zipCode: '46000',
        leadSource: 'Website Inquiry',
        leadScore: 82,
        tags: ['Buyer', 'Bahria Town', 'Active Inquiries'],
        status: 'active',
        propertyInterests: ['1 Kanal Designer Villa Bahria Phase 4'],
        notes: 'Looking for 1 Kanal house with modern finishes. Budget 6 Crore PKR.',
      },
      {
        firstName: 'Usman',
        lastName: 'Ghani',
        email: 'usman.ghani@pkholdings.com',
        phone: '+92 300 4521098',
        secondaryPhone: '+92 42 35789012',
        address: 'House 142, Sector J, Phase 6, DHA',
        city: 'Lahore',
        state: 'Punjab',
        zipCode: '54792',
        leadSource: 'Zameen.com',
        leadScore: 92,
        tags: ['Investor', 'Cash Buyer', 'DHA Lahore', 'Hot Lead'],
        status: 'active',
        propertyInterests: ['1 Kanal Designer Villa DHA Phase 6', 'Commercial Plaza Sector CCA'],
        socialLinks: { linkedin: 'https://linkedin.com/in/usman-ghani-pk' },
        notes: 'High net-worth overseas Pakistani looking to invest 15 Crore PKR in DHA Phase 6 or Phase 7.',
      },
      {
        firstName: 'Sadia',
        lastName: 'Rehman',
        email: 'sadia.rehman@yahoo.com',
        phone: '+92 321 8765432',
        address: 'Apartment 7B, Creek Marina, DHA Phase 8',
        city: 'Karachi',
        state: 'Sindh',
        zipCode: '75500',
        leadSource: 'Facebook Ads',
        leadScore: 84,
        tags: ['Luxury Buyer', 'Clifton / DHA', 'Sea Facing'],
        status: 'active',
        propertyInterests: ['3 Bed Luxury Sea-Facing Penthouse Creek Vistas', 'Emaar Oceanfront 4 Bed'],
        socialLinks: { instagram: 'https://instagram.com/sadia_interiors' },
        notes: 'Interested in luxury 3/4 bedroom apartment with unobstructed sea view. Budget ~8 Crore PKR.',
      },
      {
        firstName: 'Muhammad',
        lastName: 'Haris',
        email: 'm.haris.tech@gmail.com',
        phone: '+92 333 9123847',
        address: 'Street 19, Sector F-7/2',
        city: 'Islamabad',
        state: 'Federal Capital',
        zipCode: '44000',
        leadSource: 'Website',
        leadScore: 78,
        tags: ['Tech Founder', 'F-7 Islamabad', 'High Budget'],
        status: 'active',
        propertyInterests: ['500 Sq Yd Luxury House Sector F-7', '10 Marla Modern House Sector F-11'],
        notes: 'Software house founder expanding portfolio. Ready for immediate token money payment upon inspection.',
      },
      {
        firstName: 'Mariam',
        lastName: 'Nawazish',
        email: 'mariam.nawazish@gmail.com',
        phone: '+92 345 6781234',
        address: 'Villa 28, Safari Villas 2, Bahria Town',
        city: 'Rawalpindi',
        state: 'Punjab',
        zipCode: '46000',
        leadSource: 'Walk-In',
        leadScore: 68,
        tags: ['Bahria Town', 'First Time Buyer', 'Family Home'],
        status: 'active',
        propertyInterests: ['10 Marla Double Story House Bahria Phase 4', '5 Marla Brand New Villa Bahria Phase 8'],
        notes: 'Visited office with family. Looking for a modern 4-bedroom house with close proximity to school and park.',
      },
      {
        firstName: 'Fahad',
        lastName: 'Mustafa',
        email: 'fahad.mustafa.biz@gmail.com',
        phone: '+92 302 3456789',
        address: 'Suite 404, Business Arcade, Gulberg III',
        city: 'Lahore',
        state: 'Punjab',
        zipCode: '54000',
        leadSource: 'Property Expo Lahore',
        leadScore: 95,
        tags: ['Commercial', 'High ROI', 'Gulberg Lahore'],
        status: 'active',
        propertyInterests: ['Commercial Corporate Office Floor MM Alam Road', 'Retail Shop Main Boulevard Gulberg'],
        notes: 'Looking for 3,500 sq ft office space on MM Alam road with rental yield above 8.5% per annum.',
      },
      {
        firstName: 'Khadija',
        lastName: 'Bibi',
        email: 'khadija.bibi@outlook.com',
        phone: '+92 312 9081726',
        address: 'House 89, Sector C, Bahria Town',
        city: 'Lahore',
        state: 'Punjab',
        zipCode: '53720',
        leadSource: 'Referral',
        leadScore: 62,
        tags: ['Seller', 'Bahria Town Lahore'],
        status: 'active',
        propertyInterests: ['Sale of 10 Marla Corner House Sector C Bahria'],
        notes: 'Referred by Tariq Khan. Wants to list her 10 Marla constructed house for 3.2 Crore PKR.',
      },
      {
        firstName: 'Shahid',
        lastName: 'Afridi',
        email: 'shahid.afridi.realestate@gmail.com',
        phone: '+92 300 7719283',
        address: 'Bungalow 12, Phase 5, DHA',
        city: 'Karachi',
        state: 'Sindh',
        zipCode: '75500',
        leadSource: 'Instagram',
        leadScore: 88,
        tags: ['Celebrity / VIP', 'Karachi DHA', 'Farmhouse'],
        status: 'active',
        propertyInterests: ['4 Acre Luxury Farmhouse Malir Expressway', '2 Kanal Corner Bungalow DHA Phase 5'],
        notes: 'Wants a private luxury farmhouse setup with swimming pool and landscaped gardens near Malir Expressway.',
      },
      {
        firstName: 'Nida',
        lastName: 'Yasir',
        email: 'nida.yasir@mediaprod.pk',
        phone: '+92 321 4455667',
        address: 'Street 4, Sector E-11/3',
        city: 'Islamabad',
        state: 'Federal Capital',
        zipCode: '44000',
        leadSource: 'Google Ads',
        leadScore: 71,
        tags: ['Apartment Buyer', 'E-11 Islamabad'],
        status: 'active',
        propertyInterests: ['3 Bed Luxury Apartment Margalla Hills View E-11'],
        notes: 'Wants panoramic Margalla hills view apartment with dedicated basement parking.',
      },
      {
        firstName: 'Danish',
        lastName: 'Taimoor',
        email: 'danish.taimoor@studios.pk',
        phone: '+92 333 1122334',
        address: 'Lane 8, Tipu Sultan Road',
        city: 'Karachi',
        state: 'Sindh',
        zipCode: '75350',
        leadSource: 'Zameen.com',
        leadScore: 86,
        tags: ['Luxury Buyer', 'Tipu Sultan Karachi'],
        status: 'active',
        propertyInterests: ['1000 Sq Yd Bungalow Tipu Sultan Road Karachi'],
      },
      {
        firstName: 'Sumbul',
        lastName: 'Iqbal',
        email: 'sumbul.iqbal@gmail.com',
        phone: '+92 345 9988776',
        address: 'House 56, Block D, Model Town',
        city: 'Lahore',
        state: 'Punjab',
        zipCode: '54700',
        leadSource: 'Walk-In',
        leadScore: 58,
        tags: ['Model Town Lahore', 'Residential'],
        status: 'active',
        propertyInterests: ['2 Kanal Old Construction Plot Model Town Block D'],
      },
      {
        firstName: 'Asad',
        lastName: 'Umar',
        email: 'asad.umar@consulting.pk',
        phone: '+92 300 2233445',
        address: 'House 10, Street 1, Sector F-6/3',
        city: 'Islamabad',
        state: 'Federal Capital',
        zipCode: '44000',
        leadSource: 'Referral',
        leadScore: 94,
        tags: ['Diplomatic Enclave', 'F-6 Islamabad', 'Commercial'],
        status: 'active',
        propertyInterests: ['Embassy Rental Commercial Building Blue Area', '1 Kanal House F-6/3'],
      },
      {
        firstName: 'Hassan',
        lastName: 'Ali',
        email: 'hassan.ali.pace@gmail.com',
        phone: '+92 321 5566778',
        address: 'House 34, Sector B, DHA Phase 1',
        city: 'Rawalpindi',
        state: 'Punjab',
        zipCode: '46000',
        leadSource: 'Facebook Ads',
        leadScore: 65,
        tags: ['DHA Rawalpindi', 'Ready to Move'],
        status: 'active',
        propertyInterests: ['1 Kanal Modern Grey Structure DHA 1 Islamabad/Rawalpindi'],
      },
      {
        firstName: 'Zubair',
        lastName: 'Hashmi',
        email: 'zubair.hashmi@textile.com.pk',
        phone: '+92 333 7788990',
        address: 'Millat Town, Block B',
        city: 'Faisalabad',
        state: 'Punjab',
        zipCode: '38000',
        leadSource: 'Property Expo Lahore',
        leadScore: 89,
        tags: ['Textile Industrialist', 'Commercial Lahore', 'Bulk Investor'],
        status: 'active',
        propertyInterests: ['10 Kanal Industrial Land Sundar Industrial Estate', 'Commercial Plots Raiwind Road'],
      },
      {
        firstName: 'Rabia',
        lastName: 'Anum',
        email: 'rabia.anum@journal.pk',
        phone: '+92 345 1122445',
        address: 'Gulshan-e-Iqbal Block 13-D',
        city: 'Karachi',
        state: 'Sindh',
        zipCode: '75300',
        leadSource: 'Website',
        leadScore: 73,
        tags: ['Gulshan Karachi', 'Apartment'],
        status: 'active',
        propertyInterests: ['3 Bed Executive Apartment Gulshan-e-Iqbal'],
      },
      {
        firstName: 'Imran',
        lastName: 'Nazir',
        email: 'imran.nazir.sports@gmail.com',
        phone: '+92 300 8899001',
        address: 'House 71, Phase 3, DHA',
        city: 'Lahore',
        state: 'Punjab',
        zipCode: '54792',
        leadSource: 'Walk-In',
        leadScore: 81,
        tags: ['DHA Lahore Phase 3', 'Sports Complex Interest'],
        status: 'active',
        propertyInterests: ['2 Kanal Corner House Phase 3 DHA Lahore'],
      },
      {
        firstName: 'Mehwish',
        lastName: 'Hayat',
        email: 'mehwish.hayat@artist.pk',
        phone: '+92 321 9900112',
        address: 'Ocean Tower Penthouse, Clifton Block 9',
        city: 'Karachi',
        state: 'Sindh',
        zipCode: '75600',
        leadSource: 'Instagram',
        leadScore: 91,
        tags: ['VIP Luxury', 'Emaar Karachi', 'Penthouse'],
        status: 'active',
        propertyInterests: ['4 Bed Duplex Penthouse Emaar Coral Towers Karachi'],
      },
      {
        firstName: 'Adeel',
        lastName: 'Hussain',
        email: 'adeel.hussain@architects.pk',
        phone: '+92 333 4455889',
        address: 'Architects Studio, Sector I-8/2',
        city: 'Islamabad',
        state: 'Federal Capital',
        zipCode: '44000',
        leadSource: 'Referral',
        leadScore: 76,
        tags: ['Architect / Builder', 'I-8 Islamabad'],
        status: 'active',
        propertyInterests: ['Corner Plots Sector I-8 Islamabad for Architectural Projects'],
      },
      {
        firstName: 'Hira',
        lastName: 'Mani',
        email: 'hira.mani.media@gmail.com',
        phone: '+92 345 3344556',
        address: 'Villa 18, Block 4, Clifton',
        city: 'Karachi',
        state: 'Sindh',
        zipCode: '75600',
        leadSource: 'Zameen.com',
        leadScore: 85,
        tags: ['Clifton Karachi', 'Bungalow'],
        status: 'active',
        propertyInterests: ['600 Sq Yd Renovated Bungalow Clifton Block 4'],
      },
      {
        firstName: 'Ali',
        lastName: 'Zafar',
        email: 'ali.zafar.studio@gmail.com',
        phone: '+92 300 1234567',
        address: 'Music Valley, Lahore Cantt',
        city: 'Lahore',
        state: 'Punjab',
        zipCode: '54810',
        leadSource: 'Referral',
        leadScore: 96,
        tags: ['VIP Celebrity', 'Lahore Cantt', 'Heritage Property'],
        status: 'active',
        propertyInterests: ['4 Kanal Heritage Bungalow Lahore Cantt Mall Road'],
      },
      {
        firstName: 'Mahira',
        lastName: 'Khan',
        email: 'mahira.khan.official@gmail.com',
        phone: '+92 321 0011223',
        address: 'Bungalow 45, Phase 6, DHA',
        city: 'Karachi',
        state: 'Sindh',
        zipCode: '75500',
        leadSource: 'Instagram',
        leadScore: 97,
        tags: ['Celebrity VIP', 'DHA Karachi', 'Overseas Properties'],
        status: 'active',
        propertyInterests: ['Seafront Villa Emaar Crescent Bay', '1000 Sq Yd Bungalow Phase 6 Karachi'],
      },
    ]

    const createdContactsList: any[] = []
    for (let i = 0; i < contactsData.length; i++) {
      const contactInfo = contactsData[i]
      const assignedAgent = agentsList[i % agentsList.length]

      const contact = await Contact.create({
        ...contactInfo,
        brokerageId: alMirajBrokerage._id,
        assignedAgentId: assignedAgent._id,
        lastContactedAt: new Date(Date.now() - (i + 1) * 3600 * 1000 * 6),
      })
      createdContactsList.push(contact)

      // 5. Seed Activity Logs for Contact
      await Activity.create({
        contactId: contact._id,
        brokerageId: alMirajBrokerage._id,
        type: 'system',
        description: `Lead ingested from ${contact.leadSource} and auto-routed to Agent ${assignedAgent.firstName} ${assignedAgent.lastName}`,
        createdBy: brokerageOwner._id,
        createdByName: `${brokerageOwner.firstName} ${brokerageOwner.lastName}`,
        createdAt: new Date(Date.now() - (i + 2) * 86400 * 1000),
      })

      await Activity.create({
        contactId: contact._id,
        brokerageId: alMirajBrokerage._id,
        type: 'call',
        description: `Outbound discovery call completed (${4 + (i % 6)} mins). Client confirmed requirements and budget range.`,
        metadata: { duration: `${240 + (i % 6) * 60}s`, callOutcome: 'Connected', recordingUrl: 'https://cdn.proppulse.io/audio/rec_demo.mp3' },
        createdBy: assignedAgent._id,
        createdByName: `${assignedAgent.firstName} ${assignedAgent.lastName}`,
        createdAt: new Date(Date.now() - (i + 1) * 86400 * 1000),
      })

      if (i % 2 === 0) {
        await Activity.create({
          contactId: contact._id,
          brokerageId: alMirajBrokerage._id,
          type: 'whatsapp',
          description: `Dispatched property brochure and floor plan PDFs via WhatsApp to ${contact.phone}`,
          createdBy: assignedAgent._id,
          createdByName: `${assignedAgent.firstName} ${assignedAgent.lastName}`,
          createdAt: new Date(Date.now() - (i * 12 + 4) * 3600 * 1000),
        })
      }

      if (i % 3 === 0) {
        await Activity.create({
          contactId: contact._id,
          brokerageId: alMirajBrokerage._id,
          type: 'meeting',
          description: `Site visit scheduled for Saturday 3:00 PM at ${contact.propertyInterests[0] || 'Site Office'}`,
          createdBy: assignedAgent._id,
          createdByName: `${assignedAgent.firstName} ${assignedAgent.lastName}`,
          createdAt: new Date(Date.now() - (i * 6 + 2) * 3600 * 1000),
        })
      }

      // 6. Seed Conversations & Messages for Active Contacts
      if (i < 10) {
        const lastChannel: 'sms' | 'whatsapp' | 'email' =
          i % 3 === 0 ? 'sms' : i % 3 === 1 ? 'whatsapp' : 'email'

        const conv = await Conversation.create({
          brokerageId: alMirajBrokerage._id,
          contactId: contact._id,
          contactName: `${contact.firstName} ${contact.lastName}`,
          contactPhone: contact.phone,
          contactEmail: contact.email,
          assignedAgentId: assignedAgent._id,
          assignedAgentName: `${assignedAgent.firstName} ${assignedAgent.lastName}`,
          lastMessageText:
            contact.email === 'ayesha.lead@almiraj.com'
              ? 'Looking forward to our private walkthrough this Saturday!'
              : `Hello ${contact.firstName}, thank you for your interest in ${contact.propertyInterests[0] || 'our properties'}.`,
          lastMessageAt: new Date(Date.now() - (i + 1) * 3600 * 1000 * 2),
          lastChannel,
          unreadCount: contact.email === 'ayesha.lead@almiraj.com' ? 0 : 1,
          aiIsaEnabled: true,
          status: 'active',
          tags: contact.tags,
        })

        if (contact.email === 'ayesha.lead@almiraj.com') {
          await Message.create({
            conversationId: conv._id,
            brokerageId: alMirajBrokerage._id,
            contactId: contact._id,
            sender: 'lead',
            senderName: `${contact.firstName} ${contact.lastName}`,
            channel: 'sms',
            body: 'Hi Hamza! I received the earnest deposit confirmation. Could you please confirm if the property inspection report is ready for review?',
            direction: 'inbound',
            deliveryStatus: 'read',
            createdAt: new Date(Date.now() - 24 * 3600 * 1000),
          })

          await Message.create({
            conversationId: conv._id,
            brokerageId: alMirajBrokerage._id,
            contactId: contact._id,
            sender: 'agent',
            senderName: `${assignedAgent.firstName} ${assignedAgent.lastName}`,
            senderId: assignedAgent._id,
            channel: 'sms',
            body: 'Hello Ayesha! Yes, the inspector finished the structural analysis today. Everything passed with flying colors! I have uploaded the report to your closing checklist.',
            direction: 'outbound',
            deliveryStatus: 'delivered',
            createdAt: new Date(Date.now() - 12 * 3600 * 1000),
          })

          await Message.create({
            conversationId: conv._id,
            brokerageId: alMirajBrokerage._id,
            contactId: contact._id,
            sender: 'lead',
            senderName: `${contact.firstName} ${contact.lastName}`,
            channel: 'sms',
            body: 'Looking forward to our private walkthrough this Saturday!',
            direction: 'inbound',
            deliveryStatus: 'delivered',
            createdAt: new Date(Date.now() - 2 * 3600 * 1000),
          })
        } else {
          await Message.create({
            conversationId: conv._id,
            brokerageId: alMirajBrokerage._id,
            contactId: contact._id,
            sender: 'lead',
            senderName: `${contact.firstName} ${contact.lastName}`,
            channel: lastChannel,
            body: `Hi, I submitted an inquiry regarding ${contact.propertyInterests[0] || 'your property listing'}. Could you please send more details?`,
            direction: 'inbound',
            deliveryStatus: 'read',
            createdAt: new Date(Date.now() - (i + 2) * 3600 * 1000 * 6),
          })

          await Message.create({
            conversationId: conv._id,
            brokerageId: alMirajBrokerage._id,
            contactId: contact._id,
            sender: 'agent',
            senderName: `${assignedAgent.firstName} ${assignedAgent.lastName}`,
            senderId: assignedAgent._id,
            channel: lastChannel,
            body: `Hello ${contact.firstName}, yes it is available! I would be delighted to share full floor plans and pricing details with you.`,
            direction: 'outbound',
            deliveryStatus: 'delivered',
            createdAt: new Date(Date.now() - (i + 1) * 3600 * 1000 * 6),
          })
        }
      }
    }

    // 6. Seed Properties & Seller Radar Intelligence
    logger.info('Seeding Properties & Seller Radar Intelligence...')
    const today = new Date()
    const anniversaryDate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())

    const prop1 = await Property.create({
      brokerageId: alMirajBrokerage._id,
      ownerContactId: createdContactsList[0]._id,
      assignedAgentId: agentHamza._id,
      address: {
        street: '1420 Highland Ave',
        city: 'Austin',
        state: 'TX',
        zipCode: '78703',
        formattedAddress: '1420 Highland Ave, Austin TX 78703',
      },
      propertyType: 'single_family',
      beds: 4,
      baths: 3,
      squareFeet: 2850,
      purchaseDate: anniversaryDate,
      purchasePrice: 520000,
      currentMortgageRate: 3.12,
      estimatedMortgageBalance: 320000,
      estimatedValue: 840000,
      equity: 520000,
      equityPercent: 62,
      probabilityOfSelling: 96,
      sellSignals: ['10-Yr Purchase Anniversary', 'Empty Nester Signal', '62% Equity'],
    })

    await Property.create({
      brokerageId: alMirajBrokerage._id,
      ownerContactId: createdContactsList[1]._id,
      assignedAgentId: agentFatima._id,
      address: {
        street: '890 Barton Springs Rd',
        city: 'Austin',
        state: 'TX',
        zipCode: '78704',
        formattedAddress: '890 Barton Springs Rd, Austin TX 78704',
      },
      propertyType: 'single_family',
      beds: 5,
      baths: 4,
      squareFeet: 3400,
      purchaseDate: new Date(Date.now() - 7.8 * 365.25 * 86400 * 1000),
      purchasePrice: 650000,
      currentMortgageRate: 3.35,
      estimatedMortgageBalance: 370000,
      estimatedValue: 1150000,
      equity: 780000,
      equityPercent: 68,
      probabilityOfSelling: 92,
      sellSignals: ['High Appreciation Zone (+38%)', 'Equity Peak Indicator'],
    })

    await Property.create({
      brokerageId: alMirajBrokerage._id,
      ownerContactId: createdContactsList[2]._id,
      assignedAgentId: agentBilal._id,
      address: {
        street: '3204 Westlake Dr',
        city: 'Austin',
        state: 'TX',
        zipCode: '78746',
        formattedAddress: '3204 Westlake Dr, Austin TX 78746',
      },
      propertyType: 'single_family',
      beds: 5,
      baths: 4.5,
      squareFeet: 4200,
      purchaseDate: new Date(Date.now() - 11.4 * 365.25 * 86400 * 1000),
      purchasePrice: 820000,
      currentMortgageRate: 2.87,
      estimatedMortgageBalance: 460000,
      estimatedValue: 1450000,
      equity: 990000,
      equityPercent: 68,
      probabilityOfSelling: 89,
      sellSignals: ['Free & Clear Equity (68%)', 'Upsizing Inquiries on Zillow'],
    })

    await Property.create({
      brokerageId: alMirajBrokerage._id,
      ownerContactId: createdContactsList[3]._id,
      assignedAgentId: agentZainab._id,
      address: {
        street: '5120 River Road',
        city: 'Austin',
        state: 'TX',
        zipCode: '78734',
        formattedAddress: '5120 River Road, Austin TX 78734',
      },
      propertyType: 'single_family',
      beds: 4,
      baths: 3,
      squareFeet: 2950,
      purchaseDate: new Date(Date.now() - 8.5 * 365.25 * 86400 * 1000),
      purchasePrice: 540000,
      currentMortgageRate: 3.45,
      estimatedMortgageBalance: 310000,
      estimatedValue: 920000,
      equity: 610000,
      equityPercent: 66,
      probabilityOfSelling: 86,
      sellSignals: ['Significant Equity Spike (+44%)', 'Empty Nester Life Event'],
    })

    await Property.create({
      brokerageId: alMirajBrokerage._id,
      ownerContactId: createdContactsList[4]._id,
      assignedAgentId: agentHamza._id,
      address: {
        street: '2204 South Congress Ave',
        city: 'Austin',
        state: 'TX',
        zipCode: '78704',
        formattedAddress: '2204 South Congress Ave, Austin TX 78704',
      },
      propertyType: 'condo',
      beds: 2,
      baths: 2,
      squareFeet: 1450,
      purchaseDate: new Date(Date.now() - 5.2 * 365.25 * 86400 * 1000),
      purchasePrice: 420000,
      currentMortgageRate: 3.75,
      estimatedMortgageBalance: 280000,
      estimatedValue: 680000,
      equity: 400000,
      equityPercent: 59,
      probabilityOfSelling: 76,
      sellSignals: ['Mid-Cycle Ownership (5.2 Yrs)', 'Trapped Equity Cushion'],
    })

    await Property.create({
      brokerageId: alMirajBrokerage._id,
      ownerContactId: createdContactsList[5]._id,
      assignedAgentId: agentFatima._id,
      address: {
        street: '7402 Shoal Creek Blvd',
        city: 'Austin',
        state: 'TX',
        zipCode: '78757',
        formattedAddress: '7402 Shoal Creek Blvd, Austin TX 78757',
      },
      propertyType: 'single_family',
      beds: 3,
      baths: 2,
      squareFeet: 2100,
      purchaseDate: new Date(Date.now() - 2.8 * 365.25 * 86400 * 1000),
      purchasePrice: 580000,
      currentMortgageRate: 5.85,
      estimatedMortgageBalance: 510000,
      estimatedValue: 710000,
      equity: 200000,
      equityPercent: 28,
      probabilityOfSelling: 58,
      sellSignals: ['High Locked Rate (5.85%)', 'Refi or Move Potential'],
    })

    // Seed a sample CmaReport
    logger.info('Seeding Sample Public Micro-CMA Report...')
    await CmaReport.create({
      shareId: 'cma_demo1420highland',
      brokerageId: alMirajBrokerage._id,
      propertyId: prop1._id,
      contactId: createdContactsList[0]._id,
      createdById: agentHamza._id,
      subjectProperty: {
        formattedAddress: prop1.address.formattedAddress,
        beds: prop1.beds,
        baths: prop1.baths,
        squareFeet: prop1.squareFeet,
        propertyType: prop1.propertyType,
        purchaseDate: prop1.purchaseDate,
        purchasePrice: prop1.purchasePrice,
        estimatedValue: prop1.estimatedValue,
        estimatedMortgageBalance: prop1.estimatedMortgageBalance,
        equity: prop1.equity,
        equityPercent: prop1.equityPercent,
      },
      valuationRange: {
        low: 806000,
        target: 840000,
        high: 882000,
        confidenceScore: 94,
      },
      comparables: [
        {
          address: '1208 Pine Crest Dr, Austin TX',
          soldPrice: 825000,
          beds: 4,
          baths: 3,
          squareFeet: 2790,
          pricePerSqft: 295,
          soldDate: new Date(Date.now() - 14 * 86400 * 1000),
          distanceMiles: 0.4,
          daysOnMarket: 7,
        },
        {
          address: '1314 Oak Ridge Trail, Austin TX',
          soldPrice: 855000,
          beds: 4,
          baths: 3.5,
          squareFeet: 2920,
          pricePerSqft: 292,
          soldDate: new Date(Date.now() - 28 * 86400 * 1000),
          distanceMiles: 0.6,
          daysOnMarket: 9,
        },
        {
          address: '1102 Highland Meadow Way, Austin TX',
          soldPrice: 839000,
          beds: 4,
          baths: 3,
          squareFeet: 2840,
          pricePerSqft: 295,
          soldDate: new Date(Date.now() - 35 * 86400 * 1000),
          distanceMiles: 0.8,
          daysOnMarket: 11,
        },
      ],
      activeBuyerDemandCount: 48,
      agentBranding: {
        name: `${agentHamza.firstName} ${agentHamza.lastName}`,
        phone: agentHamza.phone || '+1 (555) 849-2041',
        email: agentHamza.email,
        brokerageName: alMirajBrokerage.name,
      },
      expiresAt: new Date(Date.now() + 60 * 86400 * 1000),
    })

    // 7. Seed Initial Audit Logs
    logger.info('Seeding Initial Audit Trail...')
    await AuditLog.create({
      userId: superAdmin._id,
      userEmail: superAdmin.email,
      userRole: superAdmin.role,
      brokerageId: alMirajBrokerage._id,
      action: 'SYSTEM_INITIALIZATION',
      resource: 'system',
      details: { environment: 'demo', seededEntities: ['brokerages', 'users', 'contacts', 'activities'] },
      ipAddress: '127.0.0.1',
      userAgent: 'PropPulse OS Seeder Script v1.0',
      status: 'success',
    })

    logger.info('===========================================================')
    logger.info('🎉 PROPPULSE OS DATABASE SEEDING COMPLETED SUCCESSFULLY!')
    logger.info('===========================================================')
    logger.info(`🏢 Primary Brokerage:   ${alMirajBrokerage.name} (${alMirajBrokerage._id})`)
    logger.info(`🏢 Secondary Brokerage: ${zameenPremierBrokerage.name} (${zameenPremierBrokerage._id})`)
    logger.info('👥 Seeded Users (Password for all: Password!123):')
    logger.info('   1. Super Admin:      superadmin@proppulse.com  (Zeeshan Tahir Alvi)')
    logger.info('   2. Brokerage Owner:  owner@almiraj.com         (Tariq Mahmood Khan)')
    logger.info('   3. Client / Lead:    ayesha.lead@almiraj.com   (Ayesha Siddiqua)')
    logger.info('   4. Agent:            hamza@almiraj.com         (Hamza Farooq)')
    logger.info('   5. Agent:            fatima@almiraj.com        (Fatima Noor)')
    logger.info('   6. Agent:            bilal@almiraj.com         (Bilal Ahmed Qureshi)')
    logger.info('   7. Agent:            zainab@almiraj.com        (Zainab Malik)')
    logger.info(`   8. Lead / Client:    ${clientKamran.email}    (Kamran Akram)`)
    logger.info(`📋 Contacts Seeded:     ${contactsData.length} Pakistani Contacts with full Activity Logs`)
    logger.info('===========================================================')

    await disconnectDB()
  } catch (error) {
    logger.error('Database seeding failed:', error)
    process.exit(1)
  }
}

// Execute if run directly
if (process.argv[1]?.includes('seed')) {
  seedDatabase()
}
