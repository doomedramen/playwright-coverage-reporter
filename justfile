# Release automation for playwright-coverage-reporter

# Default release (patch bump)
release bump="patch":
    #!/usr/bin/env -S bash
    set -euo pipefail

    echo "🚀 Starting release process ({{bump}})..."

    # Ensure we're on main branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [[ "$CURRENT_BRANCH" != "main" ]]; then
        echo "❌ Must be on main branch to release (currently on $CURRENT_BRANCH)"
        exit 1
    fi

    # Ensure working tree is clean
    if [[ -n $(git status --porcelain) ]]; then
        echo "❌ Working tree is dirty. Commit or stash changes first."
        exit 1
    fi

    # Pull latest changes
    echo "📥 Pulling latest changes..."
    git pull origin main

    # Run tests
    echo "🧪 Running tests..."
    npm run test:all

    # Bump version using package-bump
    echo "📦 Bumping version ({{bump}})..."
    package-bump {{bump}}
    NEW_VERSION=$(node -p "require('./package.json').version")
    echo "✅ Version bumped to $NEW_VERSION"

    # Build the project
    echo "🔨 Building project..."
    npm run build

    # Commit the version bump
    echo "📝 Committing version bump..."
    git add package.json package-lock.json
    git commit -m "chore: bump version to $NEW_VERSION"

    # Create and push tag
    echo "🏷️  Creating and pushing tag..."
    git tag "v$NEW_VERSION"
    git push origin main
    git push origin "v$NEW_VERSION"

    # Publish to npm
    echo "📤 Publishing to npm..."
    npm publish

    # Create GitHub release
    echo "🎉 Creating GitHub release..."
    gh release create "v$NEW_VERSION" --title "Release v$NEW_VERSION" --notes "Release v$NEW_VERSION"

    echo "✅ Release $NEW_VERSION complete!"

# Minor release
release-minor:
    just release minor

# Major release
release-major:
    just release major

# Publish without version bump (assumes tag already exists)
publish:
    #!/usr/bin/env -S bash
    set -euo pipefail

    VERSION=$(node -p "require('./package.json').version")
    echo "📤 Publishing v$VERSION to npm..."
    npm publish
    echo "✅ Published!"

# Create GitHub release for existing tag
release-notes:
    #!/usr/bin/env -S bash
    set -euo pipefail

    VERSION=$(node -p "require('./package.json').version")
    echo "🎉 Creating GitHub release for v$VERSION..."
    gh release create "v$VERSION" --title "Release v$VERSION" --notes "Release v$VERSION"
    echo "✅ GitHub release created!"
