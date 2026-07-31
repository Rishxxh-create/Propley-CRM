export interface ApiNote {
  id?: string;
  _id?: string;
  text?: string;
  note?: string;
  time?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoredNote {
  id: string;
  note: string;
  createdAt: string;
}
