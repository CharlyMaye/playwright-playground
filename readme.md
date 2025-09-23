
# Playwright Test Framework with Dependency Injection

This workspace contains a comprehensive Playwright testing framework featuring dependency injection, Page Object Model (POM) patterns, and advanced testing capabilities for Angular Material components. The framework provides code coverage reporting, visual testing, and automated test execution for web applications.

## Key Features

- **Dependency Injection System**: Custom DI container for managing test dependencies
- **Page Object Model**: Structured approach to web element interactions
- **Code Coverage**: V8 coverage reporting with Monocart reporter, based on [this example global setup script](https://github.com/edumserrano/playwright-adventures/blob/main/demos/code-coverage-with-monocart-reporter/playwright.global-setup.ts).

- **Visual Testing**: Screenshot and visual regression testing capabilities
- **Angular Material Testing**: Specialized testing for Angular Material components
- **Multi-browser Support**: Chromium, Firefox, and WebKit testing (configurable)

## Directory Structure

### `engine/`
The core testing engine providing dependency injection and test infrastructure:

- **`injector.ts`**: Main dependency injection container implementation
- **`injector.decorator.ts`**: Decorators for dependency injection metadata
- **`test.context.ts`**: Test context management and page interactions
- **`expect-service.ts`**: Custom expectation and assertion services
- **`fixtures/`**: Playwright fixtures and test setup utilities
- **`__tests__/`**: Unit tests for the testing engine itself

### `POM/` (Page Object Model)
Reusable page objects for interacting with web components.

- **`BuilderPOM.ts`**: Builder pattern implementation for POM construction
- **`InteractionPOM.ts`**: Base interaction patterns and common behaviors

### `setup/`
Configuration and setup utilities for the testing framework:

- **`setup.ts`**: Main setup function for dependency registration
- **`playwright.config.ts`**: Playwright configuration management
- **`playwright.env-vars.ts`**: Environment variable handling
- **`playwright.cli-options.ts`**: CLI option processing
- **`playwright.monocart-reporter.ts`**: Monocart reporter configuration
- **`global-setup.ts`**: Global test setup and teardown

### `stories/`
Angular application serving as a test target.

Contains a full Angular application used for testing various UI components and interactions.

### `tests/`
Test specifications and test cases.

## Usage

### Running Tests
```bash
npm test                    # Run all tests
npm run test:ui            # Run tests with Playwright UI
npm run result             # View test results
```

### Code Coverage
The framework automatically generates code coverage reports using V8 coverage data, available in multiple formats (HTML, LCOV, Cobertura).

### Visual Testing
Tests include screenshot capabilities for visual regression testing, with automatic failure captures and trace recording.
