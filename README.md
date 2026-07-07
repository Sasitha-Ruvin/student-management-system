# Open Source Student Management System

A modern admin dashboard for managing students, batches, sessions, attendance, payments, and school operations.

## What this project includes

- Student profiles and enrollment workflows
- Batch and session management
- Attendance tracking
- Payments and invoicing support
- Admin authentication and dashboard views

## Getting Started

1. Install dependencies
   ```bash
   npm install
   ```

2. Copy the environment example and update the values
   ```bash
   cp .env.example .env.local
   ```

3. Run database migrations and start the app
   ```bash
   npx prisma migrate dev
   npm run dev
   ```

4. Open http://localhost:3000

## Development notes

- This project is designed to be open source and easy to customize.
- Replace academy-specific labels and branding with your own organization details.
- Use the existing modal-based flows for creating and editing records.

## Contributing

Contributions are welcome. Please open an issue or pull request with a clear description of the change.

## License

This project is released under the MIT license.
