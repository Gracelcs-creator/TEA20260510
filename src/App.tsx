/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Storefront } from './pages/Storefront';
import { Admin } from './pages/Admin';
import { testConnection } from './lib/firebase';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}
