import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IconsSprite } from './icons-sprite.component';

describe('IconsSprite', () => {
  let component: IconsSprite;
  let fixture: ComponentFixture<IconsSprite>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [IconsSprite]
    })
      .compileComponents();

    fixture = TestBed.createComponent(IconsSprite);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
