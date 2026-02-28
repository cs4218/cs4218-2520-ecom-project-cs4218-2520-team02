// Song Jia Hui A0259494L
import React from "react";
import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import AdminOrders from './AdminOrders';
import { AuthProvider } from '../../context/auth';
import { CartProvider } from '../../context/cart';
import { SearchProvider } from '../../context/search';

jest.mock('axios');

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterAll(() => {
  jest.restoreAllMocks();
});

const mockOrders = [
  {
    _id: 'order1',
    status: 'Not Processed',
    buyer: { name: 'Alice' },
    createdAt: new Date().toISOString(),
    payment: { success: true },
    products: [{ _id: 'p1', name: 'Widget', description: 'Nice widget', price: 9.99 }],
  },
];

const Wrapper = ({ children, initialAuth } = {}) => {
  if (initialAuth) localStorage.setItem('auth', JSON.stringify(initialAuth));
  else localStorage.removeItem('auth');

  return (
    <BrowserRouter>
      <AuthProvider>
        <SearchProvider initialValue={{ keyword: '', results: [] }}>
          <CartProvider>{children}</CartProvider>
        </SearchProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('AdminOrders (axios mocked)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('fetches and renders orders when admin is authenticated', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/auth/admin-auth') {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === '/api/v1/auth/all-orders') {
        return Promise.resolve({ data: { success: true, orders: mockOrders } });
      }
      return Promise.resolve({ data: {} });
    });

    const initialAuth = { user: { role: 1 }, token: 'admin-token' };

    render(
      <Wrapper initialAuth={initialAuth}>
        <AdminOrders />
      </Wrapper>
    );

    // Wait for heading 
    expect(await screen.findByText(/All Orders/i)).toBeInTheDocument();

    // Wait for order data
    expect(await screen.findByText(/Alice/i)).toBeInTheDocument();
    expect(screen.getByText('Widget')).toBeInTheDocument();
    expect(screen.getByText(/Price : 9.99/)).toBeInTheDocument();
  });
});
