# Spotnere Vendor App

A React Native mobile application for vendors/partners to manage places, bookings, and business operations.

## Tech Stack

- **React Native**: 0.81.5
- **React**: 19.1.0
- **Expo SDK**: ~54.0.32
- **Supabase**: Backend database and authentication
- **Expo**: Development platform

## Prerequisites

- Node.js v18 or higher
- npm or yarn
- Expo CLI
- Supabase account and project

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd spotnere-vendorapp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
   - Run the SQL scripts in `database/vendors_table.sql` in your Supabase SQL editor
   - Make sure to create the `places` and `bookings` tables as well

5. Add required assets:
   - Add Parkinsans font files to `assets/fonts/`
   - Add app icons to `assets/icons/`
   - Add main app icon `assets/icon.png`

## Running the App

### Development

```bash
npm start
```

Then press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web browser

### iOS

```bash
npm run ios
```

### Android

```bash
npm run android
```

## Project Structure

```
spotnere-vendorapp/
├── App.js                 # Main application entry point
├── index.js               # Expo entry point
├── app.config.js          # Expo configuration
├── package.json           # Dependencies
├── babel.config.js        # Babel configuration
├── metro.config.js        # Metro bundler configuration
├── assets/                # Static assets
│   ├── fonts/            # Custom fonts
│   └── icons/            # App icons
├── components/            # Reusable UI components
├── screens/              # Screen components
├── config/               # Configuration files
├── constants/            # App constants (colors, fonts)
├── utils/                # Utility functions
└── database/             # Database schemas
```

## Features

- **Vendor Authentication**: Registration and login with secure password hashing
- **Places Management**: Add, edit, delete, and manage places
- **Bookings Management**: View, filter, and update booking statuses
- **Analytics Dashboard**: View revenue, booking trends, and performance metrics
- **Profile Management**: Update vendor profile and change password
- **Help Center**: FAQ and support information

## Database Schema

The app uses Supabase with the following main tables:
- `vendors` - Vendor/partner information
- `places` - Place/venue information
- `bookings` - Booking information

See `database/vendors_table.sql` for the complete schema.

## Environment Variables

Required environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

Optional:
- `COUNTRY_STATE_CITY_API` - API key for country/state/city data

## Building for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

Make sure to configure `eas.json` with your project ID before building.

## License

0BSD

## Support

For support, email support@spotnere.com or visit the Help Center in the app.
