# Security Spec

## Data Invariants
1. A menu item can only be created or updated by an admin.
2. An order can be created by any authenticated user.
3. An order can only be updated by an admin (for status changes) or the owner (only if status is 'pending', though for this app we'll only let owner read, admin update).
4. Users can only read their own orders. Admins can read all orders.
5. Menu items are readable by everyone.
6. The admins collection is strictly used to verify admin roles. Admins cannot be created by normal users.

## The "Dirty Dozen" Payloads
1. Unauthenticated user trying to create a menu item.
2. Authenticated non-admin trying to create a menu item.
3. Admin trying to create a menu item with invalid fields.
4. Unauthenticated user trying to read orders.
5. Authenticated non-admin trying to read another user's order.
6. Authenticated non-admin trying to change the status of their own order.
7. Admin trying to update an order with invalid status.
8. Authenticated user creating an order with a fake `userId`.
9. Admin creating an order with a missing `totalAmount`.
10. Spoofing an email without `email_verified == true`.
11. User trying to create an admin document for themselves.
12. Denial of wallet: large string in ID for `menuItems` get.

## The Test Runner
Tests will verify that these payloads return PERMISSION_DENIED.
