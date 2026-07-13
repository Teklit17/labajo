export type Lang = "en" | "sv";

export const translations = {
  en: {
    // Home
    eyebrow: "MOBILE CAR WASH",
    appName: "LABAGO",
    heroSub:
      "We come to you — at home or at work. You never need to move your car.",
    bookNow: "BOOK NOW",
    packagesTitle: "PACKAGES & PRICES",
    howTitle: "HOW IT WORKS",
    steps: [
      "Choose package and time",
      "Enter your address",
      "We come to you",
      "Pay on site — cash or card",
    ],
    reviewsTitle: "CUSTOMER REVIEWS",
    reviews: [
      {
        name: "Anna K.",
        text: "The car looks brand new! Super fast and smooth.",
      },
      {
        name: "Erik L.",
        text: "Right on time and very thorough. Highly recommended!",
      },
      {
        name: "Sara M.",
        text: "Fantastic service, took care of my car at work.",
      },
    ],
    contact: "Contact: Matti",

    // Package names/descriptions (prices come from CountryContext)
    packages: [
      {
        id: "quick",
        name: "Quick Wash",
        desc: "Exterior wash + Rinse & dry + Wheel clean + 20-30 min",
      },
      {
        id: "standard",
        name: "Standard",
        desc: "Exterior wash + Interior vacuum + Dashboard wipe + Windows + 40-50 min",
      },
      {
        id: "premium",
        name: "Premium",
        desc: "Full exterior + Deep interior clean + Wax & polish + Leather care + 60-90 min",
      },
      {
        id: "subscription",
        name: "Monthly Plan",
        desc: "4 standard washes/month + Priority booking + Flexible scheduling + Best value",
      },
    ],

    // Booking
    bookingTitle: "BOOK",
    editBookingTitle: "EDIT",
    saveChanges: "SAVE CHANGES",
    back: "← Back",
    step1: "1. CHOOSE PACKAGE",
    step2: "2. CHOOSE DATE",
    step3: "3. CHOOSE TIME",
    step4: "4. YOUR ADDRESS",
    step5: "5. CONTACT DETAILS",
    step6: "6. PAYMENT METHOD",
    addressPlaceholder: "Street address, city",
    savedDetailsLabel: "YOUR DETAILS",
    changeDetails: "Change details",
    addressNotesLabel: "Car type & how to find it (optional)",
    addressNotesPlaceholder: "E.g. black Volvo XC60, parked in garage spot 12",
    addressError: "Please enter your full street address.",
    namePlaceholder: "Your name",
    nameError: "Please enter your name.",
    phonePlaceholder: "Phone number",
    phoneError: "Please enter a valid phone number.",
    card: "💳 Card",
    cash: "💵 Cash",
    swish: "📱 Swish",
    payAfterServiceNote:
      "Pay on site after the wash is done, in cash, by card on our physical card reader, or via Swish.",
    includedInPlan: "Included in your plan",
    confirmBooking: "CONFIRM BOOKING",
    missingFields: "Missing fields",
    missingFieldsMsg: "Please fill in all fields to continue.",
    pickDateFirst: "Choose a date first.",
    closedThisDay: "We are closed this day.",
    fullyBooked: "Fully booked this day. Please choose another date.",

    // Confirmation
    confirmed: "BOOKING CONFIRMED",
    confirmedSub:
      "See you there! You will receive an SMS reminder the day before.",
    orderUpdated: "ORDER UPDATED",
    orderUpdatedSub: "Your booking has been updated with the new details.",
    yourPinTitleNew: "SAVE YOUR PIN CODE",
    yourPinTitle: "YOUR PIN CODE (REMINDER)",
    yourPinNote:
      "Save this code — you'll need it together with your phone number to view or manage your bookings later.",
    existingPinTitle: "USE YOUR EXISTING PIN CODE",
    existingPinNote:
      "This phone number already has a PIN code from a previous booking. Use that code together with your phone number to view or manage your bookings. Lost it? Contact us and we'll help you.",
    editBooking: "EDIT",
    cancelBooking: "CANCEL",
    bookingCancelled: "This booking has been cancelled.",
    cancelBookingTitle: "Cancel booking?",
    cancelBookingMsg:
      "Are you sure you want to cancel this booking? This cannot be undone.",
    cancelBookingYes: "Yes, cancel",
    cancelBookingNo: "No, keep it",
    orderNumber: "Order #",
    labelPackage: "Package",
    labelDate: "Date",
    labelTime: "Time",
    labelAddress: "Address",
    labelName: "Name",
    labelPhone: "Phone",
    labelPayment: "Payment",
    labelTotal: "Total",
    payCard: "Card",
    payCash: "Cash",
    paySwish: "Swish",
    backHome: "BACK TO HOME",

    // Admin
    adminTitle: "ADMIN",
    adminWelcome: "Welcome, Matti",
    statUpcoming: "Upcoming",
    statCompleted: "Completed",
    statRevenue: "Revenue",
    filterUpcoming: "Upcoming",
    filterCompleted: "Completed",
    filterAll: "All",
    noBookings: "No bookings to show.",
    markDone: "MARK AS DONE",
    done: "✓ DONE",

    // Stats
    statCarsWashed: "Cars washed",
    statServiceTime: "Service time",
    statSatisfaction: "Satisfied",

    // Why section
    whyTitle: "WHY LABAGO",
    whyItems: [
      {
        icon: "🚗",
        title: "We come to you",
        sub: "No driving, no waiting rooms.",
      },
      {
        icon: "⏱",
        title: "Fast service",
        sub: "1–4 hours depending on package.",
      },
      { icon: "💧", title: "Eco-friendly", sub: "Water-saving techniques." },
      { icon: "⭐", title: "Top rated", sub: "4.9 stars from our customers." },
      { icon: "💳", title: "Pay afterwards", sub: "Cash or card on site." },
      {
        icon: "🕗",
        title: "Working hours",
        sub: "Mon–Fri 08:00–18:00 · Sat–Sun 09:00–18:00.",
      },
    ],

    // CTA banner
    ctaBannerTitle: "Ready for a clean car?",
    ctaBannerSub: "Book in under 1 minutes.",

    // Service areas section
    serviceAreasTitle: "SERVICE AREAS",
    swedenLabel: "Sweden",
    canadaLabel: "Canada",
    canadaAreaSub: "Service station available — contact us for details.",
    areaExpandText:
      "We currently provide our services in these areas and nearby locations. We are also planning to expand to more cities in the future.",

    // Contact section
    contactTitle: "CONTACT US",
    contactPhone: "Phone",
    contactPhoneSub: "Call or SMS",
    contactEmail: "Email",
    contactEmailSub: "We reply within 24h",
    contactWhatsapp: "WhatsApp",
    contactWhatsappSub: "Quick reply",
    contactLocation: "Location",
    contactLocationSub: "Mobile service",

    // Confirmation
    bookingDetailsTitle: "BOOKING DETAILS",
    whatsNextTitle: "WHAT HAPPENS NEXT",
    whatsNextSteps: [
      "You'll get an SMS confirmation shortly.",
      "We'll remind you the day before.",
      "Our technician arrives at your location.",
      "Sit back — we handle the rest.",
    ],
    smsReminderSent: "SMS reminder sent",
    perMonth: "per month",

    // Tabs
    tabHome: "HOME",
    tabProfile: "PROFILE",
    tabAdmin: "ADMIN",
  },

  sv: {
    // Home — Swedish
    eyebrow: "MOBIL BILTVÄTT",
    appName: "LABAGO",
    heroSub:
      "Vi kommer till dig — hemma eller på jobbet. Du behöver inte flytta bilen.",
    bookNow: "BOKA NU",
    packagesTitle: "PAKET & PRISER",
    howTitle: "SÅ HÄR FUNGERAR DET",
    steps: [
      "Välj paket och tid",
      "Ange din adress",
      "Vi kommer till dig",
      "Betala på plats — kontant eller kort",
    ],
    reviewsTitle: "KUNDRECENSIONER",
    reviews: [
      { name: "Anna K.", text: "Bilen ser ut som ny! Supersnabb och smidig." },
      {
        name: "Erik L.",
        text: "Kom precis i tid och jobbade noggrant. Rekommenderas!",
      },
      {
        name: "Sara M.",
        text: "Fantastisk service, tog hand om min bil på jobbet.",
      },
    ],
    contact: "Kontakt: Matti",

    packages: [
      {
        id: "quick",
        name: "Quick Wash",
        desc: "Exteriörtvätt + Sköljning & torkning + Fälgtvätt + 20-30 min",
      },
      {
        id: "standard",
        name: "Standard",
        desc: "Exteriörtvätt + Dammsugning inuti + Torka instrumentpanel + Fönster + 40-50 min",
      },
      {
        id: "premium",
        name: "Premium",
        desc: "Full exteriör + Djuprengöring inuti + Vax & polish + Lädervård + 60-90 min",
      },
      {
        id: "subscription",
        name: "Månadsabonnemang",
        desc: "4 standardtvättar/månad + Prioriterad bokning + Flexibel schemaläggning + Bäst värde",
      },
    ],

    bookingTitle: "BOKA",
    editBookingTitle: "ÄNDRA",
    saveChanges: "SPARA ÄNDRINGAR",
    back: "← Tillbaka",
    step1: "1. VÄLJ PAKET",
    step2: "2. VÄLJ DATUM",
    step3: "3. VÄLJ TID",
    step4: "4. DIN ADRESS",
    step5: "5. KONTAKTUPPGIFTER",
    step6: "6. BETALNINGSMETOD",
    addressPlaceholder: "Gatuadress, stad",
    savedDetailsLabel: "DINA UPPGIFTER",
    changeDetails: "Ändra uppgifter",
    addressNotesLabel: "Biltyp & hur vi hittar den (valfritt)",
    addressNotesPlaceholder:
      "T.ex. svart Volvo XC60, parkerad i garage plats 12",
    addressError: "Ange din fullständiga gatuadress.",
    namePlaceholder: "Ditt namn",
    nameError: "Ange ditt namn.",
    phonePlaceholder: "Telefonnummer",
    phoneError: "Ange ett giltigt telefonnummer.",
    card: "💳 Kort",
    cash: "💵 Kontant",
    swish: "📱 Swish",
    payAfterServiceNote:
      "Betala på plats när tvätten är klar, kontant, med kort i vår fysiska kortterminal, eller via Swish.",
    includedInPlan: "Ingår i ditt abonnemang",
    confirmBooking: "BEKRÄFTA BOKNING",
    missingFields: "Fält saknas",
    missingFieldsMsg: "Fyll i alla fält för att fortsätta.",
    pickDateFirst: "Välj ett datum först.",
    closedThisDay: "Vi har stängt denna dag.",
    fullyBooked: "Fullbokat denna dag. Välj ett annat datum.",

    confirmed: "BOKNING BEKRÄFTAD",
    confirmedSub: "Vi ses på plats! Du får en påminnelse dagen innan via SMS.",
    orderUpdated: "ORDER UPPDATERAD",
    orderUpdatedSub: "Din bokning har uppdaterats med de nya uppgifterna.",
    yourPinTitleNew: "SPARA DIN PIN-KOD",
    yourPinTitle: "DIN PIN-KOD (PÅMINNELSE)",
    yourPinNote:
      "Spara den här koden — du behöver den tillsammans med ditt telefonnummer för att se eller hantera dina bokningar senare.",
    existingPinTitle: "ANVÄND DIN BEFINTLIGA PIN-KOD",
    existingPinNote:
      "Det här telefonnumret har redan en PIN-kod från en tidigare bokning. Använd den koden tillsammans med ditt telefonnummer för att se eller hantera dina bokningar. Tappat bort den? Kontakta oss så hjälper vi dig.",
    editBooking: "ÄNDRA",
    cancelBooking: "AVBOKA",
    bookingCancelled: "Den här bokningen har avbokats.",
    cancelBookingTitle: "Avboka bokning?",
    cancelBookingMsg:
      "Är du säker på att du vill avboka? Detta kan inte ångras.",
    cancelBookingYes: "Ja, avboka",
    cancelBookingNo: "Nej, behåll",
    orderNumber: "Ordernr",
    labelPackage: "Paket",
    labelDate: "Datum",
    labelTime: "Tid",
    labelAddress: "Adress",
    labelName: "Namn",
    labelPhone: "Telefon",
    labelPayment: "Betalning",
    labelTotal: "Totalt",
    payCard: "Kort",
    payCash: "Kontant",
    paySwish: "Swish",
    backHome: "TILLBAKA TILL START",

    adminTitle: "ADMIN",
    adminWelcome: "Välkommen, Matti",
    statUpcoming: "Kommande",
    statCompleted: "Avklarade",
    statRevenue: "Intäkter",
    filterUpcoming: "Kommande",
    filterCompleted: "Avklarade",
    filterAll: "Alla",
    noBookings: "Inga bokningar att visa.",
    markDone: "MARKERA SOM KLAR",
    done: "✓ AVKLARAD",

    // Stats
    statCarsWashed: "Tvättade bilar",
    statServiceTime: "Servicetid",
    statSatisfaction: "Nöjda",

    // Why section
    whyTitle: "VARFÖR LABAGO",
    whyItems: [
      {
        icon: "🚗",
        title: "Vi kommer till dig",
        sub: "Ingen körning, inga vänterum.",
      },
      {
        icon: "⏱",
        title: "Snabb service",
        sub: "1–4 timmar beroende på paket.",
      },
      { icon: "💧", title: "Miljövänlig", sub: "Vattenbesparande teknik." },
      {
        icon: "⭐",
        title: "Topprankad",
        sub: "4,9 stjärnor från våra kunder.",
      },
      {
        icon: "💳",
        title: "Betala efteråt",
        sub: "Kontant eller kort på plats.",
      },
      {
        icon: "🕗",
        title: "Öppettider",
        sub: "Mån–Fre 08:00–18:00 · Lör–Sön 09:00–18:00.",
      },
    ],

    // CTA banner
    ctaBannerTitle: "Redo för en ren bil?",
    ctaBannerSub: "Boka på under 1 minuter.",

    // Service areas section
    serviceAreasTitle: "SERVICEOMRÅDEN",
    swedenLabel: "Sverige",
    canadaLabel: "Kanada",
    canadaAreaSub: "Servicestation tillgänglig — kontakta oss för detaljer.",
    areaExpandText:
      "Vi tillhandahåller för närvarande våra tjänster i dessa områden och närliggande platser. Vi planerar också att expandera till fler städer i framtiden.",

    // Contact section
    contactTitle: "KONTAKTA OSS",
    contactPhone: "Telefon",
    contactPhoneSub: "Ring eller SMS",
    contactEmail: "E-post",
    contactEmailSub: "Vi svarar inom 24h",
    contactWhatsapp: "WhatsApp",
    contactWhatsappSub: "Snabbt svar",
    contactLocation: "Plats",
    contactLocationSub: "Mobil service",

    // Confirmation
    bookingDetailsTitle: "BOKNINGSDETALJER",
    whatsNextTitle: "VAD HÄNDER HÄRNÄST",
    whatsNextSteps: [
      "Du får en SMS-bekräftelse inom kort.",
      "Vi påminner dig dagen innan.",
      "Vår tekniker anländer till din plats.",
      "Luta dig tillbaka — vi sköter resten.",
    ],
    smsReminderSent: "SMS-påminnelse skickad",
    perMonth: "per månad",

    tabHome: "HEM",
    tabProfile: "PROFIL",
    tabAdmin: "ADMIN",
  },
};

export type T = (typeof translations)["en"];
