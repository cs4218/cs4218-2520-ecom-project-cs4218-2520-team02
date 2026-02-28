// Song Jia Hui A0259494L
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import AdminOrders from './AdminOrders';
import { AuthProvider } from '../../context/auth';
import { CartProvider } from '../../context/cart';
import { SearchProvider } from '../../context/search';

jest.mock('axios');

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

const mockMultipleOrders = [
  {
    _id: 'order1',
    status: 'Not Processed',
    buyer: { name: 'Alice' },
    createdAt: new Date().toISOString(),
    payment: { success: true },
    products: [
      { _id: 'p1', name: 'Widget', description: 'Nice widget', price: 9.99 },
      { _id: 'p2', name: 'Gadget', description: 'Cool gadget', price: 19.99 },
    ],
  },
  {
    _id: 'order2',
    status: 'Shipped',
    buyer: { name: 'Bob' },
    createdAt: new Date().toISOString(),
    payment: { success: false },
    products: [
      { _id: 'p3', name: 'Computer', description: 'Useful computer', price: 4.99 },
    ],
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

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
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

    expect(await screen.findByText(/All Orders/i)).toBeInTheDocument();
    expect(await screen.findByText(/Alice/i)).toBeInTheDocument();
    expect(screen.getByText('Widget')).toBeInTheDocument();
    expect(screen.getByText(/Price : 9.99/)).toBeInTheDocument();

    expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/all-orders');

    const numberOfSuccessText = screen.getAllByText("Success");
    expect(numberOfSuccessText.length).toBe(1);
  });

  it('does not fetch orders when no auth token is present', async () => {
    axios.get.mockResolvedValue({ data: {} });

    render(
      <Wrapper initialAuth={null}>
        <AdminOrders />
      </Wrapper>
    );

    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalledWith('/api/v1/auth/all-orders');
    });
  });

  it('renders "Failed" payment status for unsuccessful payments', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/auth/admin-auth') {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === '/api/v1/auth/all-orders') {
        return Promise.resolve({ data: { success: true, orders: mockMultipleOrders } });
      }
      return Promise.resolve({ data: {} });
    });

    const initialAuth = { user: { role: 1 }, token: 'admin-token' };

    render(
      <Wrapper initialAuth={initialAuth}>
        <AdminOrders />
      </Wrapper>
    );

    expect(await screen.findByText(/Bob/i)).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('renders multiple orders with correct buyer names and product counts', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/auth/admin-auth') {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === '/api/v1/auth/all-orders') {
        return Promise.resolve({ data: { success: true, orders: mockMultipleOrders } });
      }
      return Promise.resolve({ data: {} });
    });

    const initialAuth = { user: { role: 1 }, token: 'admin-token' };

    render(
      <Wrapper initialAuth={initialAuth}>
        <AdminOrders />
      </Wrapper>
    );

    expect(await screen.findByText(/Alice/i)).toBeInTheDocument();
    expect(await screen.findByText(/Bob/i)).toBeInTheDocument();

    // Alice has 2 products, Bob has 1 — quantity column values
    const quantities = screen.getAllByRole('cell', { name: /^[0-9]+$/ });
    const quantityValues = quantities.map((el) => el.textContent);
    expect(quantityValues).toContain('2');
    expect(quantityValues).toContain('1');
  });

  it('renders empty orders list when API returns no orders', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/auth/admin-auth') {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === '/api/v1/auth/all-orders') {
        return Promise.resolve({ data: { success: true, orders: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    const initialAuth = { user: { role: 1 }, token: 'admin-token' };

    render(
      <Wrapper initialAuth={initialAuth}>
        <AdminOrders />
      </Wrapper>
    );

    expect(await screen.findByText(/All Orders/i)).toBeInTheDocument();
    expect(screen.queryByText(/Alice/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bob/i)).not.toBeInTheDocument();
  });

  it('logs error when fetching orders fails', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/auth/admin-auth') {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === '/api/v1/auth/all-orders') {
        return Promise.reject(new Error('Network Error'));
      }
      return Promise.resolve({ data: {} });
    });

    const initialAuth = { user: { role: 1 }, token: 'admin-token' };

    render(
      <Wrapper initialAuth={initialAuth}>
        <AdminOrders />
      </Wrapper>
    );

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    consoleLogSpy.mockRestore();
  });

  it('truncates product description to 30 characters', async () => {
    const longDescOrder = [
      {
        ...mockOrders[0],
        products: [
          {
            _id: 'p1',
            name: 'Widget',
            description: 'This is a very long description that exceeds thirty characters',
            price: 9.99,
          },
        ],
      },
    ];

    axios.get.mockImplementation((url) => {
      if (url === '/api/v1/auth/admin-auth') {
        return Promise.resolve({ data: { ok: true } });
      }
      if (url === '/api/v1/auth/all-orders') {
        return Promise.resolve({ data: { success: true, orders: longDescOrder } });
      }
      return Promise.resolve({ data: {} });
    });

    const initialAuth = { user: { role: 1 }, token: 'admin-token' };

    render(
      <Wrapper initialAuth={initialAuth}>
        <AdminOrders />
      </Wrapper>
    );

    expect(await screen.findByText('This is a very long descriptio')).toBeInTheDocument();
    expect(screen.queryByText('This is a very long description that exceeds thirty characters')).not.toBeInTheDocument();
  });

  it('logs message when API returns success: false', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    axios.get.mockImplementation((url) => {
        if (url === '/api/v1/auth/admin-auth') {
        return Promise.resolve({ data: { ok: true } });
        }
        if (url === '/api/v1/auth/all-orders') {
        return Promise.resolve({ data: { success: false, message: 'Unauthorized' } });
        }
        return Promise.resolve({ data: {} });
    });

    const initialAuth = { user: { role: 1 }, token: 'admin-token' };

    render(
        <Wrapper initialAuth={initialAuth}>
        <AdminOrders />
        </Wrapper>
    );

    await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
        'Failed to fetch orders: ',
        'Unauthorized'
        );
    });

    consoleLogSpy.mockRestore();
  });

  it('logs fallback message when API returns success: false with no message', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    axios.get.mockImplementation((url) => {
        if (url === '/api/v1/auth/admin-auth') {
        return Promise.resolve({ data: { ok: true } });
        }
        if (url === '/api/v1/auth/all-orders') {
        return Promise.resolve({ data: { success: false } });
        }
        return Promise.resolve({ data: {} });
    });

    const initialAuth = { user: { role: 1 }, token: 'admin-token' };

    render(
        <Wrapper initialAuth={initialAuth}>
        <AdminOrders />
        </Wrapper>
    );

    await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(
        'Failed to fetch orders: ',
        'Unknown error'
        );
    });

    consoleLogSpy.mockRestore();
  });

  it('calls order-status API and re-fetches orders on status change', async () => {
    axios.get.mockImplementation((url) => {
        if (url === '/api/v1/auth/admin-auth') {
        return Promise.resolve({ data: { ok: true } });
        }
        if (url === '/api/v1/auth/all-orders') {
        return Promise.resolve({ data: { success: true, orders: mockOrders } });
        }
        return Promise.resolve({ data: {} });
    });

    axios.put.mockResolvedValue({ data: { success: true } });

    const initialAuth = { user: { role: 1 }, token: 'admin-token' };

    render(
        <Wrapper initialAuth={initialAuth}>
        <AdminOrders />
        </Wrapper>
    );

    await waitFor(() => {
        expect(screen.getByText('All Orders')).toBeInTheDocument();
    });

    await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Clear prior get calls so we can assert the re-fetch cleanly
    jest.clearAllMocks();

    axios.get.mockImplementation((url) => {
        if (url === '/api/v1/auth/all-orders') {
        return Promise.resolve({ data: { success: true, orders: mockOrders } });
        }
        return Promise.resolve({ data: {} });
    });

    axios.put.mockResolvedValue({ data: { success: true } });

    // Open the Ant Design Select dropdown
    const selects = screen.getAllByRole('combobox');
    fireEvent.mouseDown(selects[0]);

    // Wait for the dropdown options to appear
    await waitFor(() => {
        const processingOptions = screen.getAllByText('Processing');
        expect(processingOptions.length).toBeGreaterThan(1);
    });

    // Click the last occurrence — the one inside the dropdown
    const processingOptions = screen.getAllByText('Processing');
    fireEvent.click(processingOptions[processingOptions.length - 1]);

    await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
        '/api/v1/auth/order-status/order1',
        { status: 'Processing' }
        );
    });

    await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/all-orders');
    });
  });

  it('logs error when handleChange PUT request fails', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    axios.get.mockImplementation((url) => {
        if (url === '/api/v1/auth/admin-auth') {
        return Promise.resolve({ data: { ok: true } });
        }
        if (url === '/api/v1/auth/all-orders') {
        return Promise.resolve({ data: { success: true, orders: mockOrders } });
        }
        return Promise.resolve({ data: {} });
    });

    axios.put.mockRejectedValue(new Error('Update failed'));

    const initialAuth = { user: { role: 1 }, token: 'admin-token' };

    render(
        <Wrapper initialAuth={initialAuth}>
            <AdminOrders />
        </Wrapper>
    );

    await waitFor(() => {
        expect(screen.getByText('All Orders')).toBeInTheDocument();
    });

    await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.mouseDown(selects[0]);

    await waitFor(() => {
        const shippedOptions = screen.getAllByText('Shipped');
        expect(shippedOptions.length).toBeGreaterThan(0);
    });

    const shippedOptions = screen.getAllByText('Shipped');
    fireEvent.click(shippedOptions[shippedOptions.length - 1]);

    await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();

    consoleLogSpy.mockRestore();
  });

  it('renders "Failed" for unsuccessful payment', async () => {
    const failedPaymentOrder = [
        {
        _id: 'order2',
        status: 'Processing',
        buyer: { name: 'Bob' },
        createdAt: new Date().toISOString(),
        payment: { success: false },
        products: [{ _id: 'p2', name: 'Gadget', description: 'Cool gadget', price: 19.99 }],
        },
    ];

    axios.get.mockImplementation((url) => {
        if (url === '/api/v1/auth/admin-auth') {
        return Promise.resolve({ data: { ok: true } });
        }
        if (url === '/api/v1/auth/all-orders') {
        return Promise.resolve({ data: { success: true, orders: failedPaymentOrder } });
        }
        return Promise.resolve({ data: {} });
    });

    const initialAuth = { user: { role: 1 }, token: 'admin-token' };

    render(
        <Wrapper initialAuth={initialAuth}>
            <AdminOrders />
        </Wrapper>
    );

    expect(await screen.findByText(/Bob/i)).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.queryByText('Success')).not.toBeInTheDocument();
  });

  it('renders order using index as key when order has no _id', async () => {
    const ordersWithoutId = [
        {
        // no _id field
        status: 'Not Processed',
        buyer: { name: 'Alice' },
        createdAt: new Date().toISOString(),
        payment: { success: true },
        products: [{ _id: 'p1', name: 'Widget', description: 'Nice widget', price: 9.99 }],
        },
    ];

    axios.get.mockImplementation((url) => {
        if (url === '/api/v1/auth/admin-auth') {
        return Promise.resolve({ data: { ok: true } });
        }
        if (url === '/api/v1/auth/all-orders') {
        return Promise.resolve({ data: { success: true, orders: ordersWithoutId } });
        }
        return Promise.resolve({ data: {} });
    });

    const initialAuth = { user: { role: 1 }, token: 'admin-token' };

    render(
        <Wrapper initialAuth={initialAuth}>
        <AdminOrders />
        </Wrapper>
    );

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Widget')).toBeInTheDocument();
  });

});

