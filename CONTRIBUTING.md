# Contributing to JobRelay

Thanks for your interest in contributing to JobRelay! This project powers a Notion-native AI agent for job applications, and we welcome contributions from the community.

## How to Contribute

### Reporting Bugs
- Open an issue with a clear title and description
- Include steps to reproduce the behavior
- Mention your Notion workspace setup if relevant

### Suggesting Features
- Open an issue tagged `enhancement`
- Describe the use case and expected behavior
- Bonus: reference how it fits the existing worker architecture

### Pull Requests
1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Test with your own Notion workspace
5. Commit with clear messages (`git commit -m "Add resume scoring improvements"`)
6. Push and open a PR

### Development Setup
```bash
git clone https://github.com/nycsav/notion-career-agent.git
cd notion-career-agent
npm install
cp .env.example .env  # Add your Notion API keys
npm run build
```

## Code Style
- TypeScript strict mode
- Descriptive variable names
- Comment worker tool logic for maintainability

## Worker Architecture
JobRelay uses 5 worker tools — if you're adding a new capability, consider whether it fits as a new worker or extends an existing one:

| Worker | Purpose |
|--------|---------|
| `scanJobs` | Search job boards via MCP connectors |
| `tailorResume` | Generate role-specific resumes and cover letters |
| `getCareerInsight` | Provide market analysis and interview prep |
| `getAgentStatus` | Report pipeline status and metrics |
| `configureAgent` | Set automation preferences |

## License
By contributing, you agree that your contributions will be licensed under the MIT License.
