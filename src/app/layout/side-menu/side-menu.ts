import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface MenuItem {
  label: string;
  route?: string;
  icon: string;
  disabled?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-side-menu',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './side-menu.html',
  styleUrl: './side-menu.scss',
})
export class SideMenu {
  protected readonly sections: MenuSection[] = [
    {
      title: 'General',
      items: [{ label: 'Inicio', route: '/dashboard', icon: '◉' }],
    },
    {
      title: 'Catálogo',
      items: [
        { label: 'Artículos', route: '/catalog/articles', icon: '☷' },
        { label: 'Impuestos', route: '/catalog/taxes', icon: '%' },
        { label: 'Conceptos libres', route: '/catalog/free-concepts', icon: '✦' },
        { label: 'Localizaciones', route: '/catalog/locations', icon: '◇' },
      ],
    },
    {
      title: 'Operativa',
      items: [
        { label: 'Inventario', route: '/inventory/items', icon: '⊞' },
        { label: 'Compras', route: '/purchases', icon: '↧' },
        { label: 'Ventas', icon: '↥', disabled: true },
      ],
    },
    {
      title: 'Personas',
      items: [
        { label: 'Usuarios', icon: '☺', disabled: true },
        { label: 'Proveedores', icon: '⌂', disabled: true },
        { label: 'Clientes', icon: '☻', disabled: true },
      ],
    },
    {
      title: 'Configuración',
      items: [{ label: 'Métodos de pago', icon: '€', disabled: true }],
    },
  ];
}
