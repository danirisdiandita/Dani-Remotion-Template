# Next.js Development Standards

This project follows a strict architectural pattern for Next.js 15 apps. Follow these rules for all new features and modifications.

## 1. Authentication
- **Framework**: Use [Better Auth](https://better-auth.com/) for all authentication tasks.
- Ensure the server-side session check is used in middleware or server actions.

## 2. Database
- **Provider**: Use **Prisma** as the default ORM.
- Always maintain the schema in `prisma/schema.prisma`.

## 3. Styling & Theme
- **UI Component Library**: Use **shadcn/ui** default components.
- **Strict Theme Rule**: Stay within the "Default" shadcn theme. Do NOT innovate or add custom complex design systems. Standard shadcn + Next.js is the preferred aesthetic.

## 4. Data Fetching (TanStack Query)
- **Library**: Use **TanStack Query (v5+)** for all client-side data fetching and mutations.
- **Folder Structure**:
    - Build custom hooks inside the `./hooks/` directory (e.g., `hooks/use-render-video.ts`).
    - Summon these hooks into the client-side components.
    - Do NOT call `fetch` or `axios` directly inside the component body.

## 5. User Interaction (The "Sonner Workflow")
For every interactive element (Buttons, Forms):
1.  **On Click**: Call the mutation/action.
2.  **Visual State**: Immediately show a **Loader** (spinner) and **Disable** the triggering button.
3.  **Completion**: Once the process is done (success or error), show a **sonner toast** notification indicating the result.

---
*Note: This rule file ensures a consistent, high-end "one-click" experience for the production engine.*
