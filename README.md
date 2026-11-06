# Spectacle GTM Template

Official Google Tag Manager template for Spectacle analytics integration.

## Features
- 📊 Page tracking with custom properties
- 👤 User identification and traits
- 🎯 Custom event tracking  
- 🏢 Group/organization tracking
- 🔒 Consent aware: while the visitor denies `analytics_storage` in Google consent mode, the tag sets no cookie and sends nothing, and runs once they grant it. Sites without consent mode are not affected.
- 🐛 Debug mode for development

## Installation
1. Open Google Tag Manager
2. Go to Templates → Tag Templates
3. Click "Search Gallery"
4. Search for "Spectacle"
5. Add to workspace

## Documentation
Visit [docs.spectaclehq.com/docs/installation/google-tag-manager-gtm](https://www.spectaclehq.com/docs/installation/google-tag-manager-gtm) for complete setup guide.

## Development

Run `node --test tests/*.test.mjs` with Node.js 22 or later. The tests execute
the template's script with mocked GTM APIs and validate its JSON sections.

## Support
- 📖 [Documentation](https://www.spectaclehq.com/docs/installation/google-tag-manager-gtm)
- 🐛 [Issues](https://github.com/spectacle/spectacle-gtm-template/issues)
- 💬 [Discussions](https://github.com/spectacle/spectacle-gtm-template/discussions)

## License
Apache 2.0 - see the [LICENSE](LICENSE) file for details.