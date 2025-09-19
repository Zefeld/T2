import React from 'react';
import { useAppSelector } from '../../store/hooks';
import { cn } from '../../lib/utils';
import {
  HeartIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const footerLinks: Record<string, FooterLink[]> = {
  product: [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'API Documentation', href: '/docs/api' },
    { label: 'Integrations', href: '/integrations' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
  ],
  support: [
    { label: 'Help Center', href: '/help' },
    { label: 'Community', href: '/community', external: true },
    { label: 'Status', href: '/status' },
    { label: 'Feedback', href: '/feedback' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'GDPR Compliance', href: '/gdpr' },
    { label: 'Security', href: '/security' },
  ],
};

const socialLinks = [
  {
    name: 'GitHub',
    href: 'https://github.com/company/t2-platform',
    icon: CodeBracketIcon,
  },
  {
    name: 'Website',
    href: 'https://t2-platform.com',
    icon: GlobeAltIcon,
  },
  {
    name: 'Security',
    href: '/security',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Documentation',
    href: '/docs',
    icon: DocumentTextIcon,
  },
];

export const Footer: React.FC = () => {
  const { sidebarOpen, isMobile } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);

  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className={cn(
        'bg-background border-t border-border mt-auto transition-all duration-300',
        {
          'ml-0': !sidebarOpen || isMobile,
          'ml-64': sidebarOpen && !isMobile,
        }
      )}
    >
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">T2</span>
              </div>
              <span className="font-bold text-lg">T2 Platform</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Advanced AI-powered platform for speech recognition, text-to-speech, 
              and intelligent HR analytics with gamification.
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target={social.href.startsWith('http') ? '_blank' : undefined}
                  rel={social.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="p-2 rounded-md hover:bg-accent transition-colors"
                  title={social.name}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Support</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-6 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>© {currentYear} T2 Platform. All rights reserved.</span>
              <div className="hidden md:flex items-center space-x-1">
                <span>Made with</span>
                <HeartIcon className="w-4 h-4 text-red-500" />
                <span>for better HR experiences</span>
              </div>
            </div>

            {/* Status & Version Info */}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              {user && (
                <span className="hidden sm:inline">
                  Welcome back, {user.name}
                </span>
              )}
              
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>All systems operational</span>
              </div>
              
              <span className="text-xs bg-muted px-2 py-1 rounded">
                v2.1.0
              </span>
            </div>
          </div>

          {/* Mobile Copyright */}
          <div className="md:hidden mt-4 text-center">
            <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
              <span>Made with</span>
              <HeartIcon className="w-4 h-4 text-red-500" />
              <span>for better HR experiences</span>
            </div>
          </div>
        </div>

        {/* Development Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center space-x-2">
                <CodeBracketIcon className="w-4 h-4" />
                <span>Development Info</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Environment:</span> Development
                </div>
                <div>
                  <span className="font-medium">Build:</span> {process.env.REACT_APP_BUILD_ID || 'local'}
                </div>
                <div>
                  <span className="font-medium">API:</span> {process.env.REACT_APP_API_URL || 'localhost'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;