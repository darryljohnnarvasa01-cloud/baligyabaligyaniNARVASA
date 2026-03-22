# Admin README

## Purpose

The admin module is the BrewHaus back-office workspace. It exists so an authenticated `admin`
user can run daily operations without touching the database directly.

Primary admin responsibilities:

- Monitor business health from one place.
- Review, update, and dispatch customer orders.
- Maintain the product catalog, categories, and pricing.
- Control promotions through coupon management.
- Watch stock levels and perform restocks.
- Create rider accounts and manage delivery assignment readiness.

## Access Model

- Frontend routes live under `/admin/*`.
- Frontend access is protected by `RoleGuard` with `allowedRoles={['admin']}`.
- Backend admin APIs live under `/api/v1/admin/*`.
- Backend access is protected by `auth:sanctum` and `role:admin,sanctum`.

This means the admin area is both UI-protected and API-protected.

## Admin Route Map

| Route | Screen | Purpose |
| --- | --- | --- |
| `/admin/dashboard` | Dashboard | Operational overview for sales, orders, and stock pressure |
| `/admin/orders` | Orders | Filter orders, move statuses, and assign riders |
| `/admin/orders/:id` | Order Detail | Inspect one order in depth, including proof of delivery |
| `/admin/products` | Products | Search, filter, and manage catalog items |
| `/admin/products/new` | Product Form | Create a new product |
| `/admin/products/:id/edit` | Product Form | Edit an existing product |
| `/admin/categories` | Categories | Manage catalog grouping and storefront organization |
| `/admin/coupons` | Coupons | Create and maintain promotions |
| `/admin/inventory` | Inventory | Review stock position and restock products |
| `/admin/users` | Users | Review users and create rider accounts |

## Screen Purposes

### Dashboard

The dashboard is the admin command center.

It is used to:

- See headline metrics such as pending orders, revenue, and low-stock pressure.
- Refresh operations data quickly.
- Copy a low-stock report for coordination.
- Jump directly into orders, inventory, products, or coupons.

This is the recommended first screen at the start of the day.

### Orders

The Orders page is the fulfillment control board.

It is used to:

- Filter orders by order status, payment status, payment method, and date range.
- Review the dispatch pipeline from `pending` to `delivered`.
- Assign riders to packed or shipped orders.
- Update order status as fulfillment progresses.
- Watch live delivery workload and COD exposure.

This page is where admin converts paid or confirmed demand into actual delivery work.

### Order Detail

The Order Detail page is the full operational view of one order.

It is used to:

- Inspect customer info, shipping address, and order items.
- Review payment snapshot and lifecycle progress.
- Assign or reassign a rider.
- Update status when the order moves to the next stage.
- Review delivery proof image and rider notes after completion.

Important: delivery proof is produced by the rider flow. Admin reviews it here.

### Products

The Products page is the catalog list and search surface.

It is used to:

- Search by product name, SKU, or slug.
- Filter by category and active/inactive state.
- Jump into create or edit flows.
- Remove products when they should no longer exist in the catalog.

### Product Form

The Product Form is the main catalog authoring tool.

It is used to define:

- Product identity: name, slug, SKU, category.
- Merchandising copy: short description and full description.
- Pricing: price and optional sale price.
- Stock setup: stock quantity and low-stock threshold.
- Product media: image uploads and primary image.
- Visibility flags: featured and active.
- Product tags.

This is the main entry point for introducing a new sellable item.

### Categories

The Categories page manages catalog taxonomy.

It is used to:

- Create storefront groupings before products are attached.
- Edit category descriptions, sort order, and active state.
- Upload category images.
- Keep the storefront organized and easier to browse.

### Coupons

The Coupons page manages promotional logic.

It is used to:

- Create coupon codes.
- Choose discount type (`percent` or fixed amount).
- Set value, minimum order amount, usage limits, and expiry.
- Toggle whether a coupon is active.
- Review whether a coupon is active, exhausted, or expired.

### Inventory

The Inventory page manages operational stock, not catalog content.

It is used to:

- Review current quantity and threshold values.
- Search inventory by name or SKU.
- See stock status quickly.
- Restock a product with a quantity and note.
- Review inventory logs per product.

This page should be used after products already exist.

### Users

The Users page is the admin directory and rider onboarding screen.

It is used to:

- Filter users by role and search term.
- Review user activity and role information.
- Create new rider accounts from admin.
- Enable riders so they can log in and become assignable in the order flow.

Important: rider assignment itself happens in Orders, not in Users.

## Admin Flow

### 1. Start-of-day flow

Recommended sequence:

1. Open Dashboard.
2. Check pending orders, low-stock count, and revenue movement.
3. Jump to Orders if fulfillment needs action.
4. Jump to Inventory if stock needs action.

### 2. Catalog setup flow

Recommended sequence:

1. Create or update Categories.
2. Create Products and attach them to the correct category.
3. Add images, pricing, stock quantity, and tags.
4. Mark products active when they are ready for storefront visibility.

This flow prepares the storefront to sell correctly.

### 3. Promotion flow

Recommended sequence:

1. Open Coupons.
2. Create a code.
3. Set discount type and value.
4. Add optional minimum order amount, usage limit, and expiry.
5. Activate the coupon.
6. Monitor whether the coupon becomes expired or exhausted.

This flow controls checkout incentives without editing checkout code.

### 4. Order fulfillment flow

The normal admin order flow is:

1. `pending`
2. `confirmed`
3. `processing`
4. `packed`
5. `shipped`
6. `out_for_delivery`
7. `delivered`

Operationally:

1. Review incoming orders on Orders.
2. Confirm and process valid orders.
3. Move orders to `packed` or `shipped` when ready for dispatch.
4. Assign an active rider.
5. Track orders as they move to `out_for_delivery`.
6. Review final proof and completion on Order Detail.

Exception states such as `cancelled` and `refunded` stop the normal fulfillment path.

### 5. Delivery and rider flow

The admin side of delivery works like this:

1. Admin creates rider accounts in Users.
2. Admin assigns riders from Orders or Order Detail.
3. Rider handles live delivery work in the rider module.
4. Rider submits proof of delivery.
5. Admin reviews the completed order and proof in Order Detail.

This keeps dispatch and field execution separated by role.

### 6. Inventory maintenance flow

Recommended sequence:

1. Open Inventory or use Dashboard low-stock signals.
2. Identify products under threshold.
3. Restock the product with a note.
4. Recheck logs to confirm the adjustment.

This flow protects the storefront from overselling and helps maintain accurate stock.

## Frontend and Backend Ownership

Frontend files that define the admin experience:

- `src/router/index.jsx`
- `src/components/admin/adminNavConfig.jsx`
- `src/pages/admin/*.jsx`

Backend files that define admin access and actions:

- `backend/routes/api.php`
- `backend/app/Http/Controllers/Api/V1/Admin/*`
- `backend/app/Http/Requests/Admin/*`
- `backend/app/Services/Admin/*`

## Operational Notes

- Admin does not perform rider delivery actions directly. Riders do that in the rider module.
- Inventory and catalog are related but not identical:
  catalog defines what exists, inventory defines how much exists.
- Delivery proof review belongs in order oversight, not in product or inventory management.
- Rider creation belongs in Users, but rider dispatch belongs in Orders.

## Summary

The admin module exists to run BrewHaus operations end to end:

- see the business state,
- manage what can be sold,
- control discounts,
- fulfill and dispatch orders,
- keep stock healthy,
- and enable riders to complete the last-mile workflow.
