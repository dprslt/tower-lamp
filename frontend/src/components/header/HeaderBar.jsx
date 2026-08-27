import {Box, HStack, IconButton, Text} from "@chakra-ui/react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPowerOff} from "@fortawesome/free-solid-svg-icons";
import {faChromecast} from "@fortawesome/free-brands-svg-icons";

const offStrategy = {
    name: 'off',
    params: {}
}

const Header = (props) => {
    const connected = Boolean(props.status)

    return <Box
        as="header"
        className={'header-bar' + (connected ? ' good' : ' bad')}
        position="sticky"
        top="0"
        zIndex="10"
        bg="surface"
        borderBottom="1px solid"
        borderColor={connected ? 'lamp.600' : 'red.500'}
        px={{base: 4, md: 6}}
        h="14"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap="4"
    >
        <HStack gap="3">
            <Box
                w="2.5"
                h="2.5"
                borderRadius="full"
                bg={connected ? 'green.400' : 'red.500'}
                boxShadow={connected ? '0 0 8px 2px rgba(74, 222, 128, 0.6)' : '0 0 8px 2px rgba(239, 68, 68, 0.6)'}
            />
            <Text fontWeight="bold" fontSize="lg">Lampe</Text>
        </HStack>

        <HStack gap="1">
            <IconButton
                aria-label="Afficher l'écran sur mobile"
                variant="ghost"
                color={props.screenEnable ? 'lamp.600' : 'gray.600'}
                display={{base: 'flex', md: 'none'}}
                onClick={() => props.toggleScreen()}
            >
                <FontAwesomeIcon icon={faChromecast} />
            </IconButton>

            <IconButton
                aria-label="Éteindre"
                variant="ghost"
                color="gray.600"
                _hover={{color: 'red.500'}}
                onClick={() => props.playHandler(offStrategy)}
            >
                <FontAwesomeIcon icon={faPowerOff} />
            </IconButton>
        </HStack>
    </Box>
}

export default Header;