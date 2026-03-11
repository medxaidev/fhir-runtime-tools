# FHIR Runtime Tools

🔗 **Live Demo**: [fhir-runtime-tools.vercel.app](https://fhir-runtime-tools.vercel.app)

A browser-based developer toolkit for testing and debugging [fhir-runtime](https://github.com/your-org/fhir-runtime). This interactive web application provides a comprehensive suite of tools for working with FHIR resources, profiles, and validation.

## 🌟 Features

### Core Tools

- **Resource Validator** - Validate FHIR resources against profiles with detailed error reporting
- **FHIRPath Lab** - Interactive FHIRPath expression evaluator and tester
- **Profile Explorer** - Browse and explore FHIR profiles and their constraints
- **Resource Lab** - Create, edit, and test FHIR resources in real-time
- **Resource Diff** - Compare FHIR resources and visualize differences
- **Resource Generator** - Generate sample FHIR resources from profiles

### Built With

- **[fhir-runtime](https://github.com/your-org/fhir-runtime)** v0.7.0 - Core FHIR validation and processing engine
- **[PrismUI](https://github.com/your-org/prismui)** - Modern React component library
- **React 19** - Latest React with concurrent features
- **Vite** - Fast build tooling and development server

## 🚀 Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/fhir-runtime-tools.git
cd fhir-runtime-tools

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 📖 Usage

1. **Select a Tool** - Choose from the sidebar navigation
2. **Load Resources** - Import FHIR resources or use sample data
3. **Validate & Test** - Run validation, execute FHIRPath, or compare resources
4. **Explore Results** - View detailed output, errors, and suggestions

## 🏗️ Project Structure

```
fhir-runtime-tools/
├── src/
│   ├── components/     # Reusable UI components
│   ├── tools/          # Individual tool implementations
│   ├── runtime/        # FHIR runtime integration
│   ├── data/           # Sample data and fixtures
│   ├── App.tsx         # Main application component
│   └── main.tsx        # Application entry point
├── public/             # Static assets
└── index.html          # HTML template
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Fangjun** - [fangjun20208@gmail.com](mailto:fangjun20208@gmail.com)

## 🔗 Links

- [Homepage](https://medxai.dev)
- [Live Demo](https://fhir-runtime-tools.vercel.app)
- [fhir-runtime Documentation](https://github.com/your-org/fhir-runtime)
- [PrismUI Documentation](https://github.com/your-org/prismui)
