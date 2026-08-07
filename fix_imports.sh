#!/bin/bash

# Fix DashboardView.tsx
sed -i "/import { items, purchaseRequests } from '..\/data\/mockData';/d" src/components/DashboardView.tsx
sed -i "s/const { setActiveTab, hasTabPermission } = useApp();/const { setActiveTab, hasTabPermission, items, purchaseRequests } = useApp();/g" src/components/DashboardView.tsx

# Fix Navbar.tsx
sed -i "/import { users } from '..\/data\/mockData';/d" src/components/Navbar.tsx
sed -i "s/const {/const {\n    users,/g" src/components/Navbar.tsx

npm run lint && npm run build
