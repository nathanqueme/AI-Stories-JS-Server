const name = process.env.npm_package_name
const version = process.env.npm_package_version

const homeMessage = `
<!DOCTYPE html> 
<html>
    <head>
      <title>API</title>
    </head>

    <body style="
    background-color: black; 
    display: flex; 
    flex: 1 1 0%; 
    flex-direction: row;
    height: 90vh;
    align-items: center ;
    justify-content: center; 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; 
    ">
 
        <div style="
       justify-items: left;
       ">
         <p style="color: white; font-size: 30px; font-weight: 800; line-height: 0.01px">${name} API</p>
           <p style="color: lightgray; font-size: 18px; font-weight: 500; line-height: 0.01px;">V.${version}</p>
      </div>

    </body>

</html>`

export default homeMessage
