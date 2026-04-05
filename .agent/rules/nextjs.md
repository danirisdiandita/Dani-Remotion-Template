---
trigger: always_on
---

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

## 4. Data Fetching & API Architecture
- **Library**: Use **TanStack Query (v5+)** for all client-side data fetching and mutations.
- **Server Components**: Fetch data directly from **Prisma** (DB) for SEO-critical or initial page loads. Do NOT `fetch` internal API routes from Server Components.
- **Client Components**: 
    - Use dedicated **API Routes** (`/app/api/...`) for CRUD operations triggered by user interaction.
    - Wrap API calls in custom hooks within `hooks/` using `useQuery` and `useMutation`.
- **API Route Structure**:
    - Always verify sessions using `auth.api.getSession`.
    - Return `NextResponse.json` with appropriate status codes (401 for unauthorized, 404 for not found, 500 for errors).
    - Scope queries strictly to the `session.user.id`.
- **Custom Hooks Pattern**:
    - `useProjects()` for listing (queryKey: `["projects"]`).
    - `useCreateProject()` for mutations (invalidate `["projects"]` on success).
    - Example: `queryClient.invalidateQueries({ queryKey: ["projects", projectId] })`.

## 5. User Interaction (The "Sonner Workflow")
For every interactive element (Buttons, Forms):
1.  **On Click**: Call the mutation/action.
2.  **Visual State**: Immediately show a **Loader** (spinner) and **Disable** the triggering button.
3.  **Completion**: Once the process is done (success or error), show a **sonner toast** notification indicating the result.

---
*Note: This rule file ensures a consistent, high-end "one-click" experience for the production engine.*
## 6. Don't overexplain, just edit if asked, and when being asked, answer briefly and to the point
