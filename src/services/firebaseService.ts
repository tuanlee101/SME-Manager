import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  runTransaction,
  OperationType,
  handleFirestoreError
} from "../firebase";

// --- Categories ---
export const getCategories = (callback: (data: any[]) => void) => {
  const q = query(collection(db, "categories"), where("isDeleted", "==", false));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, "categories"));
};

export const createCategory = async (data: any) => {
  try {
    const docRef = await addDoc(collection(db, "categories"), {
      ...data,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "categories");
  }
};

export const updateCategory = async (id: string, data: any) => {
  try {
    const docRef = doc(db, "categories", id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `categories/${id}`);
  }
};

export const deleteCategory = async (id: string) => {
  try {
    const docRef = doc(db, "categories", id);
    await updateDoc(docRef, { isDeleted: true, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
  }
};

// --- Products ---
export const getProducts = (categoryId: string | null, search: string | null, callback: (data: any[]) => void) => {
  let q = query(collection(db, "products"), where("isDeleted", "==", false));
  
  if (categoryId) {
    q = query(q, where("categoryId", "==", categoryId));
  }
  
  return onSnapshot(q, (snapshot) => {
    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    if (search) {
      data = data.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, "products"));
};

export const createProduct = async (data: any) => {
  try {
    const docRef = await addDoc(collection(db, "products"), {
      ...data,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "products");
  }
};

export const updateProduct = async (id: string, data: any) => {
  try {
    const docRef = doc(db, "products", id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const docRef = doc(db, "products", id);
    await updateDoc(docRef, { isDeleted: true, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
  }
};

export const bulkCreateProducts = async (products: any[]) => {
  try {
    await runTransaction(db, async (transaction) => {
      for (const p of products) {
        const docRef = doc(collection(db, "products"));
        transaction.set(docRef, {
          ...p,
          isDeleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "products/bulk");
  }
};

// --- Customers ---
export const getCustomers = (search: string | null, callback: (data: any[]) => void) => {
  const q = query(collection(db, "customers"), where("isDeleted", "==", false));
  return onSnapshot(q, (snapshot) => {
    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    if (search) {
      data = data.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
    }
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, "customers"));
};

export const createCustomer = async (data: any) => {
  try {
    const docRef = await addDoc(collection(db, "customers"), {
      ...data,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "customers");
  }
};

export const updateCustomer = async (id: string, data: any) => {
  try {
    const docRef = doc(db, "customers", id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `customers/${id}`);
  }
};

export const deleteCustomer = async (id: string) => {
  try {
    const docRef = doc(db, "customers", id);
    await updateDoc(docRef, { isDeleted: true, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
  }
};

// --- Invoices ---
export const getInvoices = (callback: (data: any[]) => void) => {
  const q = query(collection(db, "invoices"), where("isDeleted", "==", false), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => handleFirestoreError(error, OperationType.LIST, "invoices"));
};

export const createInvoice = async (data: { customerId: string, items: any[], status: string }) => {
  const { customerId, items, status } = data;
  try {
    return await runTransaction(db, async (transaction) => {
      // 1. Get invoice count for number
      const q = query(collection(db, "invoices"));
      const snapshot = await getDocs(q);
      const count = snapshot.size;
      const number = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, "0")}`;

      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // 2. Create invoice
      const invRef = doc(collection(db, "invoices"));
      transaction.set(invRef, {
        customerId,
        total,
        status,
        number,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 3. Create items and update stock
      for (const item of items) {
        const itemRef = doc(collection(db, "invoiceItems"));
        transaction.set(itemRef, {
          ...item,
          invoiceId: invRef.id,
          createdAt: serverTimestamp()
        });

        // Update stock
        const prodRef = doc(db, "products", item.productId);
        const prodSnap = await transaction.get(prodRef);
        if (prodSnap.exists()) {
          const currentStock = prodSnap.data().stock || 0;
          transaction.update(prodRef, { stock: currentStock - item.quantity });
        }
      }

      return invRef.id;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "invoices");
  }
};

// --- Dashboard Stats ---
export const getDashboardStats = (callback: (data: any) => void) => {
  const q = query(collection(db, "invoices"), where("isDeleted", "==", false), where("status", "==", "paid"));
  return onSnapshot(q, async (snapshot) => {
    const revenue = snapshot.docs.reduce((sum, doc) => sum + (doc.data().totalAmount || 0), 0);
    const orders = snapshot.size;
    
    // Low stock
    const prodQ = query(collection(db, "products"), where("isDeleted", "==", false), where("stock", "<=", 10));
    const prodSnap = await getDocs(prodQ);
    const lowStock = prodSnap.size;

    callback({
      revenue,
      orders,
      lowStock,
      topProducts: [] // Simplified for now
    });
  }, (error) => handleFirestoreError(error, OperationType.GET, "dashboard/stats"));
};

export const getReports = (callback: (data: any) => void) => {
  return onSnapshot(collection(db, "invoices"), async (snapshot) => {
    const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalOrders = invoices.length;
    
    const dailyRevenue: any = {};
    invoices.forEach(inv => {
      if (inv.createdAt) {
        const date = new Date(inv.createdAt.seconds * 1000).toLocaleDateString();
        dailyRevenue[date] = (dailyRevenue[date] || 0) + inv.total;
      }
    });

    const chartData = Object.keys(dailyRevenue).map(date => ({
      date,
      revenue: dailyRevenue[date]
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7);

    callback({
      totalRevenue,
      totalOrders,
      chartData,
      topProducts: [],
      categoryStats: []
    });
  });
};
