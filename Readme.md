# CS4218 Project - Virtual Vault

## 1. Project Introduction

Virtual Vault is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) e-commerce website, offering seamless connectivity and user-friendly features. The platform provides a robust framework for online shopping. The website is designed to adapt to evolving business needs and can be efficiently extended.

## 2. Website Features

- **User Authentication**: Secure user authentication system implemented to manage user accounts and sessions.
- **Payment Gateway Integration**: Seamless integration with popular payment gateways for secure and reliable online transactions.
- **Search and Filters**: Advanced search functionality and filters to help users easily find products based on their preferences.
- **Product Set**: Organized product sets for efficient navigation and browsing through various categories and collections.

## 3. Your Task

- **Unit and Integration Testing**: Utilize Jest for writing and running tests to ensure individual components and functions work as expected, finding and fixing bugs in the process.
- **UI Testing**: Utilize Playwright for UI testing to validate the behavior and appearance of the website's user interface.
- **Code Analysis and Coverage**: Utilize SonarQube for static code analysis and coverage reports to maintain code quality and identify potential issues.
- **Load Testing**: Leverage JMeter for load testing to assess the performance and scalability of the ecommerce platform under various traffic conditions.

## 4. Setting Up The Project

### 1. Installing Node.js

1. **Download and Install Node.js**:

   - Visit [nodejs.org](https://nodejs.org) to download and install Node.js.

2. **Verify Installation**:
   - Open your terminal and check the installed versions of Node.js and npm:
     ```bash
     node -v
     npm -v
     ```

### 2. MongoDB Setup

1. **Download and Install MongoDB Compass**:

   - Visit [MongoDB Compass](https://www.mongodb.com/products/tools/compass) and download and install MongoDB Compass for your operating system.

2. **Create a New Cluster**:

   - Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
   - After logging in, create a project and within that project deploy a free cluster.

3. **Configure Database Access**:

   - Create a new user for your database (if not alredy done so) in MongoDB Atlas.
   - Navigate to "Database Access" under "Security" and create a new user with the appropriate permissions.

4. **Whitelist IP Address**:

   - Go to "Network Access" under "Security" and whitelist your IP address to allow access from your machine.
   - For example, you could whitelist 0.0.0.0 to allow access from anywhere for ease of use.

5. **Connect to the Database**:

   - In your cluster's page on MongoDB Atlas, click on "Connect" and choose "Compass".
   - Copy the connection string.

6. **Establish Connection with MongoDB Compass**:
   - Open MongoDB Compass on your local machine, paste the connection string (replace the necessary placeholders), and establish a connection to your cluster.

### 3. Application Setup

To download and use the MERN (MongoDB, Express.js, React.js, Node.js) app from GitHub, follow these general steps:

1. **Clone the Repository**

   - Go to the GitHub repository of the MERN app.
   - Click on the "Code" button and copy the URL of the repository.
   - Open your terminal or command prompt.
   - Use the `git clone` command followed by the repository URL to clone the repository to your local machine:
     ```bash
     git clone <repository_url>
     ```
   - Navigate into the cloned directory.

2. **Install Frontend and Backend Dependencies**

   - Run the following command in your project's root directory:

     ```
     npm install && cd client && npm install && cd ..
     ```

3. **Add database connection string to `.env`**

   - Add the connection string copied from MongoDB Atlas to the `.env` file inside the project directory (replace the necessary placeholders):
     ```env
     MONGO_URL = <connection string>
     ```

4. **Adding sample data to database**

   - Download “Sample DB Schema” from Canvas and extract it.
   - In MongoDB Compass, create a database named `test` under your cluster.
   - Add four collections to this database: `categories`, `orders`, `products`, and `users`.
   - Under each collection, click "ADD DATA" and import the respective JSON from the extracted "Sample DB Schema".

5. **Running the Application**
   - Open your web browser.
   - Use `npm run dev` to run the app from root directory, which starts the development server.
   - Navigate to `http://localhost:3000` to access the application.

## 5. Unit Testing with Jest

Unit testing is a crucial aspect of software development aimed at verifying the functionality of individual units or components of a software application. It involves isolating these units and subjecting them to various test scenarios to ensure their correctness.  
Jest is a popular JavaScript testing framework widely used for unit testing. It offers a simple and efficient way to write and execute tests in JavaScript projects.

### Getting Started with Jest

To begin unit testing with Jest in your project, follow these steps:

1. **Install Jest**:  
   Use your preferred package manager to install Jest. For instance, with npm:

   ```bash
   npm install --save-dev jest

   ```

2. **Write Tests**  
   Create test files for your components or units where you define test cases to evaluate their behaviour.

3. **Run Tests**  
   Execute your tests using Jest to ensure that your components meet the expected behaviour.  
   You can run the tests by using the following command in the root of the directory:

   - **Frontend tests**

     ```bash
     npm run test:frontend
     ```

   - **Backend tests**

     ```bash
     npm run test:backend
     ```

   - **All the tests**
     ```bash
     npm run test
     ```

## 6. Project Member Contributions
### Song Jia Hui (A0259494L)
**Backend Unit Tests**:
- models/orderModel.js
- middlewares/authMiddleware.js
- controllers/authController.js
   - updateProfileController
   - getOrdersController
   - getAllOrdersController
   - orderStatusController

**Frontend Unit Tests**:
- client/src/pages/admin/AdminOrders.js
- client/src/pages/user/Orders.js 
- client/src/components/Routes/Private.js 
- client/src/components/UserMenu.js 
- client/src/pages/user/Dashboard.js 
- client/src/context/cart.js
- pages/cartpage.js 


### Yap Zhao Yi (A0277540B)
**Backend Unit Tests**:
- models/categoryModel.js
- controllers/categoryController.test.js
- controllers/productController.js
   - braintreePaymentController
   - braintreeTokenController

**Frontend Unit Tests**:
- client/src/components/Footer.test.js
- client/src/components/Header.test.js
- client/src/components/Layout.test.js
- client/src/components/Spinner.test.js
- client/src/hooks/useCategory.test.js
- client/src/pages/About.test.js
- client/src/pages/Categories.test.js 
- client/src/pages/Contact.test.js
- client/src/pages/Pagenotfound.test.js
- client/src/pages/Policy.test.js

**Enhancements:**
- Added validation for parameters being supplied into `categoryController.js`
- Renamed `brainTreePaymentController()` to `braintreePaymentController()` to standardize with reference of braintree
- Renamed `deleteCategoryCOntroller()` to `deleteCategoryController()`
- Validate that payment has been made successfully before saving order in `braintreePaymentController()`
- Renamed `singleCategoryController()` and `categoryController()` to getCategoryController and getAllCategoriesController respectively. 
- Fixed various minor spelling errors such as ‘errro’ instead of ‘error’, note that these spelling errors did not cause any logical errors in the execution of the code.
- Use `.reduce()` instead of `.map()` to sum prices in cart for `braintreePaymentController()`

**Bugs Identified and Squashed:**
- React `map()` in `header.js` does not have the required key for each `<li>` element
- Transactions within `braintreePaymentController()` expects a 2 decimal point string rather than a raw float


### Censon Lee Lemuel John Alejo (A0273436B)
**Backend Unit Tests**:
- models/productModel.js
- controllers/productController.js
   - productFiltersController
   - productCountController
   - productListController
   - searchProductController
   - relatedProductController
   - productCategoryController

**Frontend Unit Tests**:
- client/src/pages/HomePage.js
- client/src/pages/admin/CreateProduct.js
- client/src/components/Form/CategoryForm.js
- client/src/components/Form/SearchInput.js

**Enhancements**
- Enhance `HomePage.js` reset filter to not refresh page
- Enhance `HomePage.js` code to remove Eslint issues
- Add input validation to `productListController()`
- Add input validation to `productFiltersController()` and escape regex characters.
- Enhance comments and typos
- Set up Mockingoose to test mongoose models

**Bugs Identified and Fixed**
- Fix `HomePage.js` crash when clicking on radio filter
- Fix `HomePage.js` crash when more load more button is visible due to missing react package
- Fix `HomePage.js` getTotal not setting total state
- Fix `CreateCategory.js` elements not having unique key when in loop
- Fix `CreateCategory.js` not showing error message on failed getAllCategory()
- Fix `SearchInput.js` Axios Error when searching with empty term
- Fix `Login.js` tests failing to run
- Fix `Register.js` tests failing to run
- Fix `Prices.js` duplicate ids
