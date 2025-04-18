# Contribution Guidelines

Thank you for considering contributing to our project! We welcome contributions from everyone and appreciate your help in making this project better.

Please take a moment to review these guidelines before submitting a Pull Request (PR). Following these guidelines helps ensure a smooth and efficient contribution process for everyone involved.

## Getting Started

1.  **Install Git:** If you don't have Git installed on your system, please download and install it from the official website: [https://git-scm.com/downloads](https://git-scm.com/downloads). Git is essential for version control and collaborating on this project.

2.  **Fork the Repository:**
    * Navigate to the [HaCasa](https://github.com/damianeickhoff/HaCasa) repository on GitHub.
    * In the top-right corner of the page, click the "Fork" button. This will create a copy of the repository under your GitHub account.

3.  **Clone Your Fork:** Clone your forked repository to your local machine. Replace `https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git` with the actual URL of your forked repository:
    ```bash
    git clone https://github.com/damianeickhoff/HaCasa.git
    cd YOUR_REPOSITORY
    ```
    
4.  **Set Up Your Development Environment (Recommended: VS Code):**
    * We highly recommend using **Visual Studio Code (VS Code)** as your code editor for this project. It offers excellent Git integration, debugging tools, and a wide range of extensions that can enhance your development experience. You can download VS Code for free here: [https://code.visualstudio.com/](https://code.visualstudio.com/)
    * While you are welcome to use other editors, our team primarily uses VS Code, and our documentation and setup guides might be tailored towards it.

5.  **Create a Branch:** Create a new branch for your contribution. Please use a descriptive name, following these conventions:
    * **Feature branches:** `feature/your-new-feature`
    * **Bug fix branches:** `bugfix/description-of-bug`
    * **Improvement branches:** `improvement/your-enhancement`
    * **Issue-related branches:** If your contribution addresses a specific issue, include the issue number (e.g., `feature/issue-123-add-user-profile`).

    ```bash
    git checkout -b your-branch-name
    ```

6.  **Make Your Changes:** Implement your changes, adhering to the project's coding style and best practices. [See our docs for more info on that.](https://damianeickhoff.github.io/HaCasa/docs/development/)

7.  **Test Your Changes:** Ensure your changes are thoroughly tested and do not introduce any regressions. Add new tests if necessary.

8.  **Commit Your Changes:** Commit your changes with clear and concise commit messages. Follow these guidelines for commit messages:
    * Separate the subject from the body with a blank line.
    * Limit the subject line to 50 characters.
    * Capitalize the subject line.
    * Do not end the subject line with a period.
    * Use the body to explain the *what*, *why*, and *how* of the change.

    ```bash
    git add .
    git commit -m "feat: Add user profile functionality"
    ```

9.  **Push to Your Fork:** Push your local branch to your forked repository on GitHub:
    ```bash
    git push origin your-branch-name
    ```

10. **Submit a Pull Request (PR):**
    * Go to your forked repository on GitHub.
    * Click the "Compare & pull request" button.
    * **Target the `develop` branch:** By default, please ensure your Pull Request is targeted to the **`develop`** branch of the main repository. This is where ongoing development and contributions for the next release are integrated.
    * **Provide a clear title and description:** Write a descriptive title for your PR that summarizes your changes. In the description, provide more details about your contribution, including:
        * What problem does it solve?
        * What changes are included?
        * Any relevant context or background information.
        * Mention any related issues (e.g., `Closes #123`).
    * **Review and Discussion:** Your PR will be reviewed by the project maintainers. Be prepared to address any feedback or questions and make necessary revisions.

## Branching Strategy

We follow a simplified Gitflow branching strategy:

* **`main` (or `master`):** This branch always reflects the currently released, production-ready code.
* **`develop`:** This is the main integration branch for ongoing development. All new features, improvements, and bug fixes that are not critical for the current release should be merged into this branch. **Please target your Pull Requests to this branch.**
* **`hotfix/X.Y.Z`:** These branches are created directly from a tagged release on `main` to address critical bugs in the currently released version. They are merged back into `main` (with a new patch version tag) and then back into `develop`. External contributors are generally not expected to create hotfix branches unless specifically requested.
* **`release/X.Y.Z`:** These branches are created from `develop` when preparing for a new release. They are used for final testing and stabilization before being merged into `main`.

**Please always target your Pull Requests to the `develop` branch.** Pull Requests directly targeting the `main` branch will generally be closed with a request to retarget them to `develop`.

## Code Style and Best Practices

Please adhere to the existing code style and best practices used throughout the project. Consistency helps maintain readability and makes collaboration easier.

## Reporting Issues

If you encounter any bugs or have suggestions for improvements, please open a new issue on GitHub. Provide as much detail as possible, including:

* A clear and descriptive title.
* Steps to reproduce the issue (if it's a bug).
* Expected behavior.
* Actual behavior.
* Any relevant context or environment information.

## License

By contributing to this project, you agree that your contributions will be licensed under the project's existing [LICENSE](LICENSE) file.

## Questions?

If you have any questions about contributing, feel free to ask in the project's communication channels (e.g., issue tracker, Discord, HA Forums).

Thank you again for your contribution!
