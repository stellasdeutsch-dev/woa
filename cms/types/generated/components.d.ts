import type { Schema, Struct } from '@strapi/strapi';

export interface NoaField extends Struct.ComponentSchema {
  collectionName: 'components_noa_fields';
  info: {
    description: 'Address, phone, email, website, president\u2026';
    displayName: 'Contact field';
    icon: 'phone';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    links: Schema.Attribute.JSON;
    value: Schema.Attribute.Text;
  };
}

export interface SharedDownload extends Struct.ComponentSchema {
  collectionName: 'components_shared_downloads';
  info: {
    description: 'Document link: an uploaded file wins over the path';
    displayName: 'Download';
    icon: 'file';
  };
  attributes: {
    file: Schema.Attribute.Media<'files' | 'images'>;
    href: Schema.Attribute.String;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_links';
  info: {
    description: 'Tab or menu link';
    displayName: 'Link';
    icon: 'link';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    selected: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface SharedSocial extends Struct.ComponentSchema {
  collectionName: 'components_shared_socials';
  info: {
    displayName: 'Social link';
    icon: 'globe';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    icon: Schema.Attribute.String;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'noa.field': NoaField;
      'shared.download': SharedDownload;
      'shared.link': SharedLink;
      'shared.social': SharedSocial;
    }
  }
}
