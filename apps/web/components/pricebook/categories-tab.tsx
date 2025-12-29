'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CategoryTree } from './category-tree';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Category {
  id: string;
  stId: string;
  name: string;
  parentId: string | null;
  children: Category[];
  itemCount: number;
}

export function CategoriesTab() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['pricebook-categories-flat'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/pricebook/categories?flat=true'));
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filteredCategories = categories?.filter((cat: Category) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="border rounded-lg h-[calc(100vh-280px)]">
      <div className="grid grid-cols-3 h-full">
        {/* Category Tree */}
        <div className="border-r">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-sm">Category Hierarchy</h3>
          </div>
          <div className="p-2 overflow-auto h-[calc(100%-49px)]">
            <CategoryTree
              type="all"
              selectedId={selectedCategory?.id}
              onSelect={setSelectedCategory}
            />
          </div>
        </div>

        {/* Category List */}
        <div className="col-span-2 flex flex-col">
          <div className="p-3 border-b flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Category
            </Button>
          </div>

          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category: Category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        {category.parentId ? (
                          <Badge variant="outline">Has Parent</Badge>
                        ) : (
                          <span className="text-muted-foreground">Root</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{category.itemCount || 0}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
