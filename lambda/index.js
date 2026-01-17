import { MercadoPagoConfig, Preference } from 'mercadopago';

export const handler = async (event) => {
    console.log("💰 Iniciando Lambda de Pago...");

    // Validación de Método (Solo POST)
    // En Function URL, el método viene en queryContext o requestContext
    if (event.requestContext && event.requestContext.http && event.requestContext.http.method !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const accessToken = process.env.MP_ACCESS_TOKEN;
        if (!accessToken) {
            throw new Error("Falta configurar la variable de entorno MP_ACCESS_TOKEN en Lambda");
        }

        const client = new MercadoPagoConfig({ accessToken });
        const preference = new Preference(client);

        const body = JSON.parse(event.body);
        const { items, payer, totalAmount } = body;

        console.log("📦 Datos recibidos:", JSON.stringify(body));

        // Crear la preferencia
        const result = await preference.create({
            body: {
                items: items,
                payer: payer,
                back_urls: {
                    // IMPORTANTE: Cambiar estas URLs por la URL real de tu AWS Amplify cuando la tengas
                    // Por ahora usa la url base que te envíen o localhost si pruebas local
                    success: "https://main.d10wvb4guybfk5.amplifyapp.com",
                    failure: "https://main.d10wvb4guybfk5.amplifyapp.com",
                    pending: "https://main.d10wvb4guybfk5.amplifyapp.com"
                },
                auto_return: "approved",
            }
        });

        console.log("✅ Preferencia creada:", result.id);

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: result.id,
                init_point: result.sandbox_init_point
            })
        };

    } catch (error) {
        console.error("❌ Error en Lambda:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message || "Error interno del servidor",
                details: error
            })
        };
    }
};
