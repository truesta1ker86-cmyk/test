import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Page } from './page.component';

describe('Page', () => {
  let component: Page;
  let fixture: ComponentFixture<Page>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Page]
    })
      .compileComponents();

    fixture = TestBed.createComponent(Page);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
