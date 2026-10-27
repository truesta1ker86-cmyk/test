import { TestBed } from '@angular/core/testing';
import { StockDrafts } from './stock-drafts.service';

const key = (tenant: number) => `o1c:v2:stock-columns:${tenant}`;
const tenants = [991001, 991002];

afterEach(() => tenants.forEach((tenant) => localStorage.removeItem(key(tenant))));

describe('Warehouse column preferences', () => {
  it('starts without automatic columns and keeps shops separate', () => {
    const drafts = TestBed.inject(StockDrafts);
    expect(drafts.forShop(991001).columns()).toEqual([]);
    drafts.forShop(991001).columns.set(['W1']);
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem(key(991001))!)).toEqual(['W1']);
    expect(drafts.forShop(991002).columns()).toEqual([]);
  });
  it('restores an explicitly empty selection and saved columns in a fresh service', () => {
    localStorage.setItem(key(991001), '[]');
    localStorage.setItem(key(991002), '["W2","W1","W2"]');
    const drafts = TestBed.inject(StockDrafts);
    expect(drafts.forShop(991001).columns()).toEqual([]);
    expect(drafts.forShop(991002).columns()).toEqual(['W2', 'W1']);
    drafts.forShop(991002).columns.set([]);
    TestBed.tick();
    expect(localStorage.getItem(key(991002))).toBe('[]');
  });
  it('ignores malformed preferences', () => {
    localStorage.setItem(key(991001), 'broken');
    localStorage.setItem(key(991002), '[1,null]');
    const drafts = TestBed.inject(StockDrafts);
    expect(drafts.forShop(991001).columns()).toEqual([]);
    expect(drafts.forShop(991002).columns()).toEqual([]);
  });
});
