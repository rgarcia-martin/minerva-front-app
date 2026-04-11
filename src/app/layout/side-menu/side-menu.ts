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
        { label: 'Artículos', icon: '☷', disabled: true },
        { label: 'Impuestos', icon: '%', disabled: true },
        { label: 'Conceptos libres', icon: '✦', disabled: true },
        { label: 'Localizaciones', icon: '◇', disabled: true },
      ],
    },
    {
      title: 'Operativa',
      items: [
        { label: 'Compras', icon: '↧', disabled: true },
        { label: 'Ventas', icon: '↥', disabled: true },
        { label: 'Inventario', icon: '⊞', disabled: true },
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
